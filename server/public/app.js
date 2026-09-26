'use strict';

const REFRESH_MS = 20_000;         // moto garée
const REFRESH_MOVING_MS = 5_000;   // moto en mouvement : suivi quasi en direct
const HEARTBEAT_S = 3600;          // doit correspondre à PARKED_HEARTBEAT_MS du firmware
const DEMO = window.DEMO ?? null;  // défini uniquement par la page de démo
const $ = (id) => document.getElementById(id);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } },
};

// ---------------------------------------------------------------- API / clé
let apiKey = DEMO ? 'demo' : store.get('moto-key') || '';

async function api(path, { method = 'GET', body } = {}) {
  if (DEMO) return DEMO.api(path, { method, body });
  const res = await fetch(path, {
    method,
    headers: { 'x-api-key': apiKey, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    askKey(true);
    throw new Error('401');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

function askKey(rejected) {
  $('login-error').hidden = !rejected || !apiKey;
  if (!$('login').open) $('login').showModal();
}

$('login-form').addEventListener('submit', () => {
  apiKey = $('login-key').value.trim();
  store.set('moto-key', apiKey);
  refresh();
});

// ---------------------------------------------------------------- Messages
let toastTimer;
function toast(title, body = '', alert = false) {
  const el = $('toast');
  el.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = title;
  el.append(strong, body);
  el.className = alert ? 'alert' : '';
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), alert ? 8000 : 4000);
}
window.appNotify = toast; // utilisé par la démo pour simuler une notification

// ---------------------------------------------------------------- Carte
const map = L.map('map', { zoomControl: false }).setView([46.6, 2.4], 6);
L.control.zoom({ position: 'topright' }).addTo(map);
if (DEMO) {
  DEMO.baseLayer(L).addTo(map);
} else {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

const motoIcon = L.divIcon({ className: 'moto-icon', html: '🏍️', iconSize: [30, 30], iconAnchor: [15, 15] });
const liveMarker = L.marker([0, 0], { icon: motoIcon });
const liveTrail = L.polyline([], { color: '#ff4d4d', weight: 4, opacity: 0.9 });
let liveLayerShown = false;
let lastPosition = null;
let firstCenter = true;

// Partie de la carte non masquée par le panneau (en bas sur mobile, à gauche sur ordinateur)
function panelInsets() {
  const m = map.getContainer().getBoundingClientRect();
  const p = $('panel').getBoundingClientRect();
  if (p.width > m.width * 0.8) return { topLeft: [0, 0], bottomRight: [0, Math.max(0, m.bottom - p.top)] };
  return { topLeft: [Math.max(0, p.right - m.left), 0], bottomRight: [0, 0] };
}

// Centre la carte sur un point, au milieu de la zone visible
function focusOn(latlng, zoom = map.getZoom()) {
  const { topLeft, bottomRight } = panelInsets();
  const offset = L.point((topLeft[0] - bottomRight[0]) / 2, (topLeft[1] - bottomRight[1]) / 2);
  map.setView(map.unproject(map.project(latlng, zoom).subtract(offset), zoom), zoom);
}

// ---------------------------------------------------------------- Format
const fmtTime = (t) => new Date(t * 1000).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const fmtHour = (t) => new Date(t * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
function fmtAgo(seconds) {
  if (seconds < 60) return "à l'instant";
  const m = Math.round(seconds / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `il y a ${h} h ${String(m % 60).padStart(2, '0')}`;
  return `il y a ${Math.floor(h / 24)} jours`;
}
function fmtDuration(s) {
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
function batteryText(mv) {
  if (!mv) return '–';
  const pct = Math.max(0, Math.min(100, Math.round(((mv - 3300) / (4200 - 3300)) * 100)));
  return `${pct} % (${(mv / 1000).toFixed(2)} V)`;
}
function signalText(csq) {
  if (csq == null || csq === 99) return '–';
  return csq >= 20 ? `bon (${csq})` : csq >= 10 ? `moyen (${csq})` : `faible (${csq})`;
}

// ---------------------------------------------------------------- Surveillance
let armed = false;

function renderArm() {
  const btn = $('btn-arm');
  btn.classList.toggle('armed', armed);
  btn.innerHTML = armed
    ? '🔒 Surveillance activée<small>Tu seras alerté si la moto bouge. Touche pour désarmer avant de rouler.</small>'
    : '🔓 Surveillance désactivée<small>Touche pour armer quand tu laisses la moto.</small>';
}

$('btn-arm').addEventListener('click', async () => {
  try {
    const res = await api('/api/settings', { method: 'POST', body: { armed: !armed } });
    armed = res.armed;
    renderArm();
    toast(armed ? '🔒 Moto armée' : '🔓 Moto désarmée', armed ? 'Alerte au moindre mouvement.' : 'Bonne route !');
  } catch {
    toast('Impossible de changer la surveillance', 'Vérifie ta connexion et réessaie.');
  }
});

// ---------------------------------------------------------------- Vue direct
let refreshTimer;
let moving = false;

async function refresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, moving ? REFRESH_MOVING_MS : REFRESH_MS);
  if (!apiKey) return askKey(false);
  let data;
  try {
    data = await api('/api/latest');
  } catch {
    return;
  }
  if ($('login').open) $('login').close();

  const { position: p, status: s, server_time: now } = data;
  armed = data.armed;
  renderArm();
  moving = Boolean(p && p.spd >= 10 && now - p.t < 600);

  const badge = $('badge');
  if (!s) {
    badge.textContent = 'Jamais vu';
    badge.className = 'badge';
  } else if (now - s.last_seen > HEARTBEAT_S * 2.5) {
    badge.textContent = 'Muet';
    badge.className = 'badge bad';
  } else if (moving) {
    badge.textContent = armed ? 'Alerte' : 'En mouvement';
    badge.className = armed ? 'badge bad' : 'badge warn';
  } else {
    badge.textContent = 'En ligne';
    badge.className = 'badge ok';
  }
  if (s) {
    $('seen').textContent = `Dernier contact du tracker : ${fmtAgo(now - s.last_seen)} (${fmtTime(s.last_seen)})`;
    $('s-bat').textContent = batteryText(s.bat);
    $('s-csq').textContent = signalText(s.csq);
  }

  if (!p) {
    $('ago').textContent = 'Aucune position reçue pour le moment';
    return;
  }
  lastPosition = p;
  $('ago').textContent = `Position ${fmtAgo(now - p.t)} · ${fmtHour(p.t)}`;
  $('s-speed').textContent = p.spd != null ? `${Math.round(p.spd)} km/h` : '–';
  $('s-sats').textContent = p.sat ?? '–';
  $('btn-go').href = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  liveMarker.setLatLng([p.lat, p.lng]).bindPopup(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}<br>${fmtTime(p.t)}`);

  if (tripLayer) return; // on regarde un ancien trajet : ne pas toucher à la carte
  if (!liveLayerShown) {
    liveMarker.addTo(map);
    liveTrail.addTo(map);
    liveLayerShown = true;
  }
  if (moving) {
    // En mouvement : trace de la dernière demi-heure et carte qui suit la moto
    const pts = await api(`/api/positions?from=${now - 1800}&to=${now + 60}`).catch(() => []);
    liveTrail.setLatLngs(pts.map((q) => [q.lat, q.lng]));
    focusOn([p.lat, p.lng], firstCenter ? 16 : map.getZoom());
    firstCenter = false;
  } else {
    liveTrail.setLatLngs([]);
    if (firstCenter) focusOn([p.lat, p.lng], 16);
    firstCenter = false;
  }
}

$('btn-center').addEventListener('click', () => {
  if (lastPosition) focusOn([lastPosition.lat, lastPosition.lng], 17);
});

// ---------------------------------------------------------------- Vues
function showView(name) {
  for (const v of ['live', 'trips', 'settings']) $(`view-${v}`).hidden = v !== name;
}

document.querySelectorAll('.btn-back').forEach((btn) =>
  btn.addEventListener('click', () => {
    clearTrip();
    showView('live');
    if (!liveLayerShown) {
      liveMarker.addTo(map);
      liveTrail.addTo(map);
      liveLayerShown = true;
    }
    if (lastPosition) focusOn([lastPosition.lat, lastPosition.lng], 16);
  })
);

// ---------------------------------------------------------------- Trajets
let tripLayer = null;
let replay = null;

$('btn-trips').addEventListener('click', async () => {
  showView('trips');
  const list = $('trips');
  list.innerHTML = '<li class="muted">Chargement…</li>';
  let trips;
  try {
    trips = await api('/api/trips');
  } catch {
    list.innerHTML = '<li class="muted">Erreur de chargement</li>';
    return;
  }
  list.innerHTML = '';
  if (!trips.length) list.innerHTML = '<li class="muted">Aucun trajet sur les 30 derniers jours</li>';
  for (const trip of trips) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${fmtTime(trip.start)}</strong>
      <small>${(trip.distance_m / 1000).toFixed(1)} km · ${fmtDuration(trip.end - trip.start)} · max ${Math.round(trip.max_spd)} km/h</small>`;
    li.addEventListener('click', () => {
      list.querySelectorAll('li').forEach((el) => el.classList.remove('active'));
      li.classList.add('active');
      loadTrip(trip);
    });
    list.append(li);
  }
});

function clearTrip() {
  stopReplay();
  if (tripLayer) tripLayer.remove();
  tripLayer = null;
  replay = null;
  $('replay').hidden = true;
}

async function loadTrip(trip) {
  clearTrip();
  const pts = await api(`/api/positions?from=${trip.start}&to=${trip.end}`);
  if (pts.length < 2) return;
  liveMarker.remove();
  liveTrail.remove();
  liveLayerShown = false;

  const line = L.polyline(pts.map((p) => [p.lat, p.lng]), { color: '#ff6a1a', weight: 4, opacity: 0.85 });
  const start = L.circleMarker([pts[0].lat, pts[0].lng], { radius: 6, color: '#3ecf6e', fillOpacity: 1 });
  const end = L.circleMarker([pts.at(-1).lat, pts.at(-1).lng], { radius: 6, color: '#ff4d4d', fillOpacity: 1 });
  const cursor = L.marker([pts[0].lat, pts[0].lng], { icon: motoIcon });
  tripLayer = L.layerGroup([line, start, end, cursor]).addTo(map);
  const { topLeft, bottomRight } = panelInsets();
  map.fitBounds(line.getBounds(), {
    paddingTopLeft: [topLeft[0] + 30, topLeft[1] + 30],
    paddingBottomRight: [bottomRight[0] + 30, bottomRight[1] + 30],
  });

  replay = { pts, cursor, offset: 0, duration: pts.at(-1).t - pts[0].t, timer: null, lastFrame: 0 };
  $('r-slider').max = replay.duration;
  $('r-slider').value = 0;
  $('replay').hidden = false;
  seek(0);
}

// Position interpolée à `offset` secondes après le début du trajet.
function seek(offset) {
  const { pts } = replay;
  replay.offset = Math.max(0, Math.min(offset, replay.duration));
  const t = pts[0].t + replay.offset;
  let i = 1;
  while (i < pts.length - 1 && pts[i].t < t) i++;
  const a = pts[i - 1], b = pts[i];
  const k = b.t === a.t ? 1 : Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  replay.cursor.setLatLng([a.lat + (b.lat - a.lat) * k, a.lng + (b.lng - a.lng) * k]);
  const spd = a.spd != null && b.spd != null ? a.spd + (b.spd - a.spd) * k : null;
  $('r-info').textContent = `${fmtHour(t)} · ${spd != null ? Math.round(spd) + ' km/h' : ''}`;
  $('r-slider').value = replay.offset;
}

function frame(now) {
  if (!replay?.timer) return;
  const dt = (now - replay.lastFrame) / 1000;
  replay.lastFrame = now;
  seek(replay.offset + dt * Number($('r-speed').value));
  if (replay.offset >= replay.duration) return stopReplay();
  replay.timer = requestAnimationFrame(frame);
}

function stopReplay() {
  if (replay?.timer) cancelAnimationFrame(replay.timer);
  if (replay) replay.timer = null;
  $('r-play').textContent = '▶ Rejouer';
}

$('r-play').addEventListener('click', () => {
  if (!replay) return;
  if (replay.timer) return stopReplay();
  if (replay.offset >= replay.duration) seek(0);
  replay.lastFrame = performance.now();
  replay.timer = requestAnimationFrame(frame);
  $('r-play').textContent = '❚❚ Pause';
});

$('r-slider').addEventListener('input', (e) => replay && seek(Number(e.target.value)));

// ---------------------------------------------------------------- Réglages et notifications
const pushSupported = !DEMO && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let settings = null;

if (pushSupported) navigator.serviceWorker.register('sw.js').catch((err) => console.warn('service worker', err));

function b64ToBytes(b64) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function renderPush() {
  const status = $('push-status'), btn = $('btn-push'), test = $('btn-push-test');
  $('ios-hint').hidden = true;
  btn.hidden = true;
  test.hidden = true;
  if (DEMO) {
    status.textContent =
      "Dans cette démo, les alertes s'affichent en haut de l'écran. Dans ta vraie app, ce seront de vraies notifications, même téléphone verrouillé.";
    return;
  }
  if (!pushSupported) {
    if (isIOS && !installed) {
      status.textContent = 'Pas encore disponibles dans Safari.';
      $('ios-hint').hidden = false;
    } else {
      status.textContent = "Ce navigateur ne gère pas les notifications (il faut une adresse en https://).";
    }
    return;
  }
  const sub = await currentSubscription();
  btn.hidden = false;
  if (sub) {
    status.textContent = `✅ Activées sur cet appareil (${settings?.devices ?? 1} appareil(s) au total).`;
    btn.textContent = 'Désactiver sur cet appareil';
    test.hidden = false;
  } else if (Notification.permission === 'denied') {
    status.textContent = 'Bloquées : autorise-les dans les réglages du téléphone (Notifications → Ma moto).';
    btn.hidden = true;
  } else {
    status.textContent = 'Désactivées sur cet appareil.';
    btn.textContent = 'Activer les notifications';
  }
}

$('btn-settings').addEventListener('click', async () => {
  clearTrip();
  showView('settings');
  try {
    settings = await api('/api/settings');
    $('auto-arm').value = String(settings.auto_arm_min);
  } catch {
    /* affiché quand même */
  }
  renderPush();
});

$('btn-push').addEventListener('click', async () => {
  try {
    const existing = await currentSubscription();
    if (existing) {
      await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: existing.endpoint } });
      await existing.unsubscribe();
      toast('Notifications désactivées sur cet appareil');
    } else {
      // Sur iPhone, la demande d'autorisation doit suivre directement le geste de l'utilisateur
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return renderPush();
      const reg = await navigator.serviceWorker.ready;
      const key = settings?.push_public_key ?? (await api('/api/settings')).push_public_key;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
      await api('/api/push/subscribe', { method: 'POST', body: sub.toJSON() });
      toast('🔔 Notifications activées', 'Tu seras prévenu si la moto bouge alors qu’elle est armée.');
    }
    settings = await api('/api/settings');
  } catch (err) {
    console.error(err);
    toast('Échec', 'Impossible de changer les notifications. Réessaie.');
  }
  renderPush();
});

$('btn-push-test').addEventListener('click', async () => {
  try {
    await api('/api/push/test', { method: 'POST' });
    toast('Test envoyé', 'La notification devrait arriver dans quelques secondes.');
  } catch {
    toast('Échec du test', 'Le serveur n’a pas pu envoyer la notification.');
  }
});

$('auto-arm').addEventListener('change', async (e) => {
  try {
    await api('/api/settings', { method: 'POST', body: { auto_arm_min: Number(e.target.value) } });
    toast('Réglage enregistré');
  } catch {
    toast('Échec', "Le réglage n'a pas été enregistré.");
  }
});

$('btn-logout').addEventListener('click', () => {
  store.del('moto-key');
  apiKey = '';
  askKey(false);
});

// ---------------------------------------------------------------- Démarrage
refresh();
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refresh());
window.appRefresh = refresh;
