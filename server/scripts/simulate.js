// Simule le tracker pour tester le serveur et la carte sans le matériel.
//   npm run simulate            -> crée 3 trajets dans l'historique (jours précédents)
//   npm run simulate -- live    -> simule un trajet en direct (un envoi toutes les 5 s)
import { loadConfig } from '../src/config.js';

const cfg = loadConfig();
const URL_BASE = process.env.SIM_URL ?? `http://localhost:${cfg.port}`;
const KEY = cfg.deviceKey;

const HOME = { lat: 45.764, lng: 4.8357 }; // Lyon, à changer à volonté

// Balade pseudo-aléatoire : cap qui dérive doucement, vitesse entre 30 et 90 km/h.
function* ride(start, t0, stepS = 15) {
  let { lat, lng } = start;
  let heading = Math.random() * 360;
  let spd = 40;
  for (let t = t0; ; t += stepS) {
    heading = (heading + (Math.random() - 0.5) * 40 + 360) % 360;
    spd = Math.min(90, Math.max(30, spd + (Math.random() - 0.5) * 15));
    const d = (spd / 3.6) * stepS; // mètres parcourus
    lat += (d * Math.cos((heading * Math.PI) / 180)) / 111_320;
    lng += (d * Math.sin((heading * Math.PI) / 180)) / (111_320 * Math.cos((lat * Math.PI) / 180));
    yield { t, lat: +lat.toFixed(6), lng: +lng.toFixed(6), spd: +spd.toFixed(1), crs: Math.round(heading), alt: 180, hdop: 0.9, sat: 9 };
  }
}

async function send(pts) {
  const res = await fetch(`${URL_BASE}/api/positions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ bat: 3900 + Math.round(Math.random() * 200), csq: 18, pts }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
}

const now = Math.floor(Date.now() / 1000);

if (process.argv[2] === 'live') {
  const gen = ride(HOME, now, 5);
  console.log('Trajet en direct, Ctrl+C pour arrêter');
  for (;;) {
    const p = gen.next().value;
    p.t = Math.floor(Date.now() / 1000);
    await send([p]);
    console.log(`${p.lat}, ${p.lng}  ${p.spd} km/h`);
    await new Promise((r) => setTimeout(r, 5000));
  }
} else {
  for (let day = 3; day >= 1; day--) {
    const t0 = now - day * 86_400;
    const gen = ride(HOME, t0);
    const pts = Array.from({ length: 80 + Math.floor(Math.random() * 120) }, () => gen.next().value);
    for (let i = 0; i < pts.length; i += 30) await send(pts.slice(i, i + 30));
    console.log(`Trajet J-${day} : ${pts.length} points`);
  }
  console.log('OK — ouvre la page web pour voir les trajets');
}
