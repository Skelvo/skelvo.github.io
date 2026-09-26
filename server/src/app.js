import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { haversine } from './geo.js';

export { haversine };

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));
const LEAFLET_DIR = fileURLToPath(new URL('../node_modules/leaflet/dist', import.meta.url));
const TRIP_GAP_S = 10 * 60;      // plus de 10 min sans point = nouveau trajet
const MIN_TRIP_M = 300;          // on ignore les "trajets" de moins de 300 m (dérive GPS)
const MAX_POINTS_PER_REPORT = 500;
const MAX_RANGE_POINTS = 50_000;

function safeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ''));
  const bb = Buffer.from(String(b ?? ''));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function requireKey(expected) {
  return (req, res, next) => {
    const key = req.get('x-api-key') ?? req.query.key;
    if (!safeEqual(key, expected)) return res.status(401).json({ error: 'clé API invalide' });
    next();
  };
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function parsePoint(p, now) {
  if (!p || typeof p !== 'object') return null;
  const t = num(p.t), lat = num(p.lat), lng = num(p.lng);
  if (t === null || lat === null || lng === null) return null;
  if (!Number.isInteger(t) || t < 1_577_836_800 || t > now + 86_400) return null; // >= 2020, pas dans le futur
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    t, lat, lng,
    spd: num(p.spd), alt: num(p.alt), crs: num(p.crs), hdop: num(p.hdop),
    sat: Number.isInteger(p.sat) ? p.sat : null,
  };
}

export function splitTrips(points) {
  const trips = [];
  let cur = null;
  for (const p of points) {
    if (!cur || p.t - cur.end > TRIP_GAP_S) {
      cur = { start: p.t, end: p.t, points: 0, distance_m: 0, max_spd: 0, _last: null };
      trips.push(cur);
    }
    if (cur._last) cur.distance_m += haversine(cur._last, p);
    cur.end = p.t;
    cur.points++;
    cur.max_spd = Math.max(cur.max_spd, p.spd ?? 0);
    cur._last = p;
  }
  return trips
    .filter((t) => t.points >= 2 && t.distance_m >= MIN_TRIP_M)
    .map(({ _last, ...t }) => ({ ...t, distance_m: Math.round(t.distance_m) }))
    .reverse(); // plus récent d'abord
}

function timeRange(req, defaultDays) {
  const now = Math.floor(Date.now() / 1000);
  const to = Number.parseInt(req.query.to, 10) || now;
  const from = Number.parseInt(req.query.from, 10) || to - defaultDays * 86_400;
  return { from, to };
}

export function createApp({ db, deviceKey, readKey, alerts, push }) {
  if (!deviceKey || !readKey) throw new Error('DEVICE_KEY et READ_KEY sont obligatoires');
  if (deviceKey === readKey) throw new Error('DEVICE_KEY et READ_KEY doivent être différentes');

  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);

  // --- Tracker -> serveur ---------------------------------------------------
  // Corps : { bat, csq, pts: [{ t, lat, lng, spd, alt, crs, hdop, sat }] }
  // Réponse 204 sans contenu pour économiser la data de la carte SIM.
  app.post('/api/positions', requireKey(deviceKey), express.json({ limit: '128kb' }), async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'JSON attendu' });
    const raw = Array.isArray(body.pts) ? body.pts : [];
    if (raw.length > MAX_POINTS_PER_REPORT) return res.status(413).json({ error: 'trop de points' });

    const now = Math.floor(Date.now() / 1000);
    const points = raw.map((p) => parsePoint(p, now)).filter(Boolean);
    if (points.length !== raw.length) {
      console.warn(`[positions] ${raw.length - points.length} point(s) invalide(s) ignoré(s)`);
    }
    const inserted = db.saveReport({
      points,
      bat: Number.isInteger(body.bat) ? body.bat : null,
      csq: Number.isInteger(body.csq) ? body.csq : null,
      now,
    });
    console.log(`[positions] reçu ${raw.length}, enregistré ${inserted}`);
    res.status(204).end();
    try {
      await alerts?.onReport(points.sort((a, b) => a.t - b.t));
    } catch (err) {
      console.error('[alertes]', err);
    }
  });

  // --- Lecture (page web) ---------------------------------------------------
  const read = express.Router();
  read.use(requireKey(readKey));
  read.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  read.get('/latest', (req, res) => {
    res.json({
      position: db.latest(),
      status: db.status(),
      armed: db.get('armed', false),
      server_time: Math.floor(Date.now() / 1000),
    });
  });

  // --- Surveillance et notifications -----------------------------------------
  read.get('/settings', (req, res) => {
    res.json({
      armed: db.get('armed', false),
      auto_arm_min: db.get('auto_arm_min', 0),
      push_public_key: push?.publicKey ?? null,
      devices: db.listSubscriptions().length,
    });
  });

  read.post('/settings', express.json(), (req, res) => {
    const { armed, auto_arm_min } = req.body ?? {};
    if (typeof armed === 'boolean' && alerts) alerts.arm(armed);
    if ([0, 5, 15, 30, 60].includes(auto_arm_min)) db.set('auto_arm_min', auto_arm_min);
    res.json({ armed: db.get('armed', false), auto_arm_min: db.get('auto_arm_min', 0) });
  });

  read.post('/push/subscribe', express.json(), (req, res) => {
    const sub = req.body;
    if (typeof sub?.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
      return res.status(400).json({ error: 'abonnement invalide' });
    }
    db.addSubscription({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
    res.status(204).end();
  });

  read.post('/push/unsubscribe', express.json(), (req, res) => {
    if (typeof req.body?.endpoint === 'string') db.removeSubscription(req.body.endpoint);
    res.status(204).end();
  });

  read.post('/push/test', async (req, res) => {
    if (!push) return res.status(503).json({ error: 'notifications indisponibles' });
    await push.send({ title: '🏍️ Test', body: 'Les notifications marchent !', tag: 'moto-test' });
    res.status(204).end();
  });

  read.get('/positions', (req, res) => {
    const { from, to } = timeRange(req, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || MAX_RANGE_POINTS, MAX_RANGE_POINTS);
    res.json(db.range(from, to, limit));
  });

  read.get('/trips', (req, res) => {
    const { from, to } = timeRange(req, 30);
    res.json(splitTrips(db.range(from, to, MAX_RANGE_POINTS)));
  });

  app.use('/api', read);
  app.get('/healthz', (req, res) => res.type('text').send('ok'));
  app.use(express.static(PUBLIC_DIR));
  app.use('/vendor/leaflet', express.static(LEAFLET_DIR));

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'requête trop grosse' });
    console.error(err);
    res.status(500).json({ error: 'erreur serveur' });
  });

  return app;
}
