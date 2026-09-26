import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createAlerts, SILENT_AFTER_S } from '../src/alerts.js';
import { openDb } from '../src/db.js';

let db, sent, clock, alerts;
const T0 = 1_790_000_000;
const HOME = { lat: 45.764, lng: 4.8357 };
const report = async (pts) => {
  db.saveReport({ points: pts, bat: 4000, csq: 18, now: clock });
  await alerts.onReport(pts);
};
const pt = (t, north_m, spd = 0) => ({ t, lat: HOME.lat + north_m / 111_320, lng: HOME.lng, spd });

beforeEach(() => {
  db = openDb(':memory:');
  sent = [];
  clock = T0;
  alerts = createAlerts({ db, notify: async (m) => sent.push(m), now: () => clock });
});

test('désarmée : aucun mouvement ne déclenche d’alerte', async () => {
  await report([pt(T0, 0)]);
  await report([pt(T0 + 60, 500, 40)]);
  assert.equal(sent.length, 0);
});

test('armée : alerte quand la moto quitte sa place, puis rappel après 5 min', async () => {
  await report([pt(T0, 0)]);
  alerts.arm(true);
  clock = T0 + 60;
  await report([pt(clock, 20, 1)]); // dérive GPS : rien
  assert.equal(sent.length, 0);
  clock += 60;
  await report([pt(clock, 150, 12)]);
  assert.equal(sent.length, 1);
  assert.match(sent[0].title, /bouge/);
  clock += 60;
  await report([pt(clock, 600, 40)]); // trop tôt pour un rappel
  assert.equal(sent.length, 1);
  clock += 5 * 60;
  await report([pt(clock, 3000, 60)]);
  assert.equal(sent.length, 2);
  assert.match(sent[1].title, /toujours/);
});

test('armement automatique après N minutes à l’arrêt', async () => {
  db.set('auto_arm_min', 15);
  await report([pt(T0, 0)]);
  clock = T0 + 10 * 60;
  await alerts.tick();
  assert.equal(alerts.state().armed, false);
  clock = T0 + 16 * 60;
  await alerts.tick();
  assert.equal(alerts.state().armed, true);
  // désarmer remet le compteur à zéro
  alerts.arm(false);
  clock += 5 * 60;
  await alerts.tick();
  assert.equal(alerts.state().armed, false);
});

test('tracker muet puis de retour', async () => {
  await report([pt(T0, 0)]);
  clock = T0 + SILENT_AFTER_S + 1;
  await alerts.tick();
  await alerts.tick();
  assert.equal(sent.length, 1);
  assert.match(sent[0].title, /muet/);
  await report([]);
  assert.equal(sent.length, 2);
  assert.match(sent[1].title, /en ligne/);
});
