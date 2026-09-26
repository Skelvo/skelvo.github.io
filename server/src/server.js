import { createAlerts } from './alerts.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { createPush } from './push.js';

const cfg = loadConfig();
if (cfg.created) console.log(`Clés créées dans ${cfg.secretsFile} — affiche-les avec : npm run keys`);

const db = openDb(cfg.dbPath);
const push = createPush({ db, vapid: cfg.vapid });
const alerts = createAlerts({ db, notify: (msg) => push.send(msg) });
const app = createApp({ db, deviceKey: cfg.deviceKey, readKey: cfg.readKey, alerts, push });

setInterval(() => alerts.tick().catch((err) => console.error('[alertes]', err)), 60_000);

app.listen(cfg.port, () => {
  console.log(`Tracker moto : http://localhost:${cfg.port}  (base : ${cfg.dbPath})`);
});
