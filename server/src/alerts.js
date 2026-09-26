import { haversine } from './geo.js';

export const ALERT_RADIUS_M = 80;      // la moto s'éloigne de plus de 80 m de sa place
export const ALERT_SPEED_KMH = 10;     // ou roule à plus de 10 km/h
export const ALERT_REPEAT_S = 5 * 60;  // rappel toutes les 5 min tant qu'elle bouge
export const SILENT_AFTER_S = 150 * 60; // pas de nouvelles depuis 2 h 30 (battement de cœur = 1 h)

const fmtHour = (t) =>
  new Date(t * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

// Surveillance : armement, alerte de mouvement, tracker muet.
// État gardé dans la table settings pour survivre à un redémarrage du serveur.
export function createAlerts({ db, notify, now = () => Math.floor(Date.now() / 1000) }) {
  const state = () => ({
    armed: db.get('armed', false),
    autoArmMin: db.get('auto_arm_min', 0),
  });

  function arm(value) {
    db.set('armed', value);
    if (value) {
      const p = db.latest();
      db.set('anchor', p ? { lat: p.lat, lng: p.lng } : null);
      db.set('last_alert_at', 0);
    } else {
      db.set('disarmed_at', now());
      db.set('alerting', false);
    }
  }

  // Appelé à chaque envoi du tracker, avec les nouveaux points (triés par heure).
  async function onReport(points) {
    if (db.get('silent_alerted', false)) {
      db.set('silent_alerted', false);
      await notify({ title: '✅ Tracker de nouveau en ligne', body: 'Il vient de donner des nouvelles.', tag: 'moto-silent' });
    }
    if (!db.get('armed', false) || points.length === 0) return;

    let anchor = db.get('anchor');
    let moved = null;
    for (const p of points) {
      if (!anchor) {
        anchor = { lat: p.lat, lng: p.lng };
        db.set('anchor', anchor);
        continue;
      }
      const d = haversine(anchor, p);
      if (d >= ALERT_RADIUS_M || (p.spd ?? 0) >= ALERT_SPEED_KMH) moved = { ...p, d };
    }
    if (!moved || now() - db.get('last_alert_at', 0) < ALERT_REPEAT_S) return;

    db.set('last_alert_at', now());
    const first = !db.get('alerting', false);
    db.set('alerting', true);
    const dist = moved.d >= 1000 ? `${(moved.d / 1000).toFixed(1)} km` : `${Math.round(moved.d)} m`;
    await notify({
      title: first ? '🚨 Ta moto bouge !' : '🚨 Ta moto bouge toujours',
      body: `${Math.round(moved.spd ?? 0)} km/h, à ${dist} de sa place (${fmtHour(moved.t)}). Touche pour la suivre.`,
      tag: 'moto-move',
    });
  }

  // Appelé chaque minute.
  async function tick() {
    const t = now();
    const status = db.status();
    if (status && t - status.last_seen >= SILENT_AFTER_S && !db.get('silent_alerted', false)) {
      db.set('silent_alerted', true);
      await notify({
        title: '⚠️ Tracker muet',
        body: `Aucune nouvelle depuis ${fmtHour(status.last_seen)}. Fils coupés, boîtier arraché ou pas de réseau ?`,
        tag: 'moto-silent',
      });
    }

    const { armed, autoArmMin } = state();
    const latest = db.latest();
    if (!armed && autoArmMin > 0 && latest) {
      const still = t - Math.max(latest.t, db.get('disarmed_at', 0));
      if (still >= autoArmMin * 60) {
        console.log('[alertes] armement automatique');
        arm(true);
      }
    }
    // Fin d'alerte : plus de mouvement depuis 15 min
    if (db.get('alerting', false) && latest && t - latest.t > 15 * 60) db.set('alerting', false);
  }

  return { state, arm, onReport, tick };
}
