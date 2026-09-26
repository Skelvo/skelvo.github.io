import { createApp } from './app.js';
import { openDb } from './db.js';

const { DEVICE_KEY, READ_KEY, PORT = '3000', DB_PATH = './data/tracker.db' } = process.env;

for (const [name, value] of Object.entries({ DEVICE_KEY, READ_KEY })) {
  if (!value || value.length < 16) {
    console.error(`${name} manquante ou trop courte (16 caractères minimum). Voir .env.example`);
    process.exit(1);
  }
}

const db = openDb(DB_PATH);
const app = createApp({ db, deviceKey: DEVICE_KEY, readKey: READ_KEY });

app.listen(Number(PORT), () => {
  console.log(`Tracker moto : http://localhost:${PORT}  (base : ${DB_PATH})`);
});
