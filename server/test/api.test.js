import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

const DEVICE = 'device-key-for-tests-123';
const READ = 'read-key-for-tests-4567';
let server, base, db;

before(async () => {
  db = openDb(':memory:');
  server = createApp({ db, deviceKey: DEVICE, readKey: READ }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  db.close();
});

const post = (body, key = DEVICE) =>
  fetch(`${base}/api/positions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const get = (path, key = READ) => fetch(`${base}${path}`, { headers: { 'x-api-key': key } });

const t0 = Math.floor(Date.now() / 1000) - 3600;

test('refuse les mauvaises clés', async () => {
  assert.equal((await post({ pts: [] }, 'nope')).status, 401);
  assert.equal((await post({ pts: [] }, READ)).status, 401);
  assert.equal((await get('/api/latest', DEVICE)).status, 401);
  assert.equal((await fetch(`${base}/api/latest`)).status, 401);
});

test('JSON invalide -> 400', async () => {
  assert.equal((await post('{pas du json')).status, 400);
});

test('enregistre, dédoublonne et filtre les points', async () => {
  const pts = [];
  // trajet de ~1,1 km vers le nord, un point par minute
  for (let i = 0; i < 11; i++) pts.push({ t: t0 + i * 60, lat: 48.85 + i * 0.001, lng: 2.35, spd: 40, sat: 8 });
  pts.push({ t: t0 + 999, lat: 123, lng: 2 }); // latitude invalide
  const res = await post({ bat: 4012, csq: 17, pts });
  assert.equal(res.status, 204);

  const latest = await (await get('/api/latest')).json();
  assert.equal(latest.position.t, t0 + 600);
  assert.equal(latest.status.bat, 4012);
  assert.equal(latest.status.csq, 17);

  assert.equal((await post({ pts: pts.slice(0, 3) })).status, 204); // doublons ignorés

  const all = await (await get(`/api/positions?from=${t0 - 10}&to=${t0 + 10_000}`)).json();
  assert.equal(all.length, 11);
});

test('heartbeat sans point met à jour le statut', async () => {
  assert.equal((await post({ bat: 3900, csq: 12, pts: [] })).status, 204);
  const latest = await (await fetch(`${base}/api/latest?key=${READ}`)).json();
  assert.equal(latest.status.bat, 3900);
});

test('découpe les trajets', async () => {
  // second trajet 2 h plus tard
  const t1 = t0 + 7200;
  const pts = [0, 1, 2, 3].map((i) => ({ t: t1 + i * 30, lat: 45.0 + i * 0.002, lng: 5.0 }));
  pts.push({ t: t1 + 5000, lat: 45.0, lng: 5.0 }); // point isolé : pas un trajet
  await post({ pts });
  const trips = await (await get(`/api/trips?from=${t0 - 10}&to=${t1 + 10_000}`)).json();
  assert.equal(trips.length, 2);
  assert.equal(trips[0].start, t1);
  assert.ok(Math.abs(trips[1].distance_m - 1112) < 5, `distance ${trips[1].distance_m}`);
});
