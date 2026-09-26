import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS positions (
      t           INTEGER PRIMARY KEY,  -- heure GPS (secondes Unix, UTC), sert aussi d'anti-doublon
      lat         REAL NOT NULL,
      lng         REAL NOT NULL,
      spd         REAL,                 -- km/h
      alt         REAL,                 -- m
      crs         REAL,                 -- cap en degrés
      hdop        REAL,
      sat         INTEGER,
      received_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_status (
      id        INTEGER PRIMARY KEY CHECK (id = 1),
      last_seen INTEGER NOT NULL,       -- dernier contact du tracker (heure serveur)
      bat       INTEGER,                -- mV
      csq       INTEGER                 -- qualité signal 0-31 (99 = inconnu)
    );
  `);

  const insertPos = db.prepare(`
    INSERT OR IGNORE INTO positions (t, lat, lng, spd, alt, crs, hdop, sat, received_at)
    VALUES (:t, :lat, :lng, :spd, :alt, :crs, :hdop, :sat, :received_at)
  `);
  const upsertStatus = db.prepare(`
    INSERT INTO device_status (id, last_seen, bat, csq) VALUES (1, :last_seen, :bat, :csq)
    ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen, bat = excluded.bat, csq = excluded.csq
  `);
  const latest = db.prepare('SELECT * FROM positions ORDER BY t DESC LIMIT 1');
  const status = db.prepare('SELECT last_seen, bat, csq FROM device_status WHERE id = 1');
  const range = db.prepare(
    'SELECT t, lat, lng, spd, alt, crs, hdop, sat FROM positions WHERE t BETWEEN ? AND ? ORDER BY t LIMIT ?'
  );

  return {
    saveReport({ points, bat, csq, now }) {
      let inserted = 0;
      db.exec('BEGIN');
      try {
        for (const p of points) inserted += Number(insertPos.run({ ...p, received_at: now }).changes);
        upsertStatus.run({ last_seen: now, bat, csq });
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
      return inserted;
    },
    latest: () => latest.get() ?? null,
    status: () => status.get() ?? null,
    range: (from, to, limit) => range.all(from, to, limit),
    close: () => db.close(),
  };
}
