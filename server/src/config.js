import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import webpush from 'web-push';

const newKey = () => randomBytes(18).toString('base64url');

// Les clés sont créées automatiquement au premier lancement et gardées dans
// <dossier de la base>/secrets.json. Les variables d'environnement, si présentes, sont prioritaires.
export function loadConfig(env = process.env) {
  const dbPath = env.DB_PATH || './data/tracker.db';
  const file = join(dirname(dbPath), 'secrets.json');
  mkdirSync(dirname(file), { recursive: true });

  const saved = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  let changed = false;
  const ensure = (name, make) => {
    if (!saved[name]) {
      saved[name] = make();
      changed = true;
    }
  };
  ensure('deviceKey', newKey);
  ensure('readKey', newKey);
  if (!saved.vapid) {
    saved.vapid = webpush.generateVAPIDKeys();
    changed = true;
  }
  if (changed) writeFileSync(file, JSON.stringify(saved, null, 2) + '\n', { mode: 0o600 });

  return {
    port: Number(env.PORT || 3000),
    dbPath,
    secretsFile: file,
    created: changed,
    deviceKey: env.DEVICE_KEY || saved.deviceKey,
    readKey: env.READ_KEY || saved.readKey,
    vapid: {
      publicKey: saved.vapid.publicKey,
      privateKey: saved.vapid.privateKey,
      subject: env.VAPID_SUBJECT || 'mailto:moto-tracker@example.com',
    },
  };
}
