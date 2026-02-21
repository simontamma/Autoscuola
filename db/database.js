const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'autoscuola.db');

let db;

function getDB() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function initDB() {
  const db = getDB();

  /* ── Tabelle ────────────────────────────────────────────────── */
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    /* Admin */
    CREATE TABLE IF NOT EXISTS admin (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* Sedi */
    CREATE TABLE IF NOT EXISTS sedi (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      citta      TEXT NOT NULL,
      indirizzo  TEXT NOT NULL,
      telefono   TEXT,
      orari      TEXT,
      metro      TEXT,
      maps_url   TEXT,
      attiva     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* Pacchetti */
    CREATE TABLE IF NOT EXISTS pacchetti (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT NOT NULL,
      licenza     TEXT NOT NULL,
      prezzo      REAL NOT NULL,
      descrizione TEXT,
      features    TEXT,   /* JSON array */
      in_evidenza INTEGER DEFAULT 0,
      attivo      INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    /* Iscrizioni */
    CREATE TABLE IF NOT EXISTS iscrizioni (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nome         TEXT NOT NULL,
      cognome      TEXT NOT NULL,
      email        TEXT NOT NULL,
      telefono     TEXT,
      data_nascita TEXT,
      pacchetto_id INTEGER REFERENCES pacchetti(id),
      sede_id      INTEGER REFERENCES sedi(id),
      note         TEXT,
      stato        TEXT DEFAULT 'nuova',  /* nuova | confermata | completata | annullata */
      created_at   TEXT DEFAULT (datetime('now'))
    );

    /* Feedback */
    CREATE TABLE IF NOT EXISTS feedback (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nome         TEXT NOT NULL,
      cognome      TEXT NOT NULL,
      email        TEXT NOT NULL,
      sede_id      INTEGER REFERENCES sedi(id),
      valutazione  INTEGER NOT NULL CHECK(valutazione BETWEEN 1 AND 5),
      testo        TEXT NOT NULL,
      approvato    INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now'))
    );
  `);

  /* ── Seed: admin di default ─────────────────────────────────── */
  const adminExists = db.prepare('SELECT id FROM admin WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin1234', 10);
    db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)').run('admin', hash);
    console.log('✅  Admin creato  →  user: admin  |  pass: admin1234');
  }

  /* ── Seed: sedi di default ──────────────────────────────────── */
  const sediCount = db.prepare('SELECT COUNT(*) as n FROM sedi').get().n;
  if (sediCount === 0) {
    const insertSede = db.prepare(`
      INSERT INTO sedi (citta, indirizzo, telefono, orari, metro, maps_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertSede.run('Milano Centro', 'Via Torino 42, 20123 Milano', '02 4567 8901', 'Lun–Ven 9:00–19:00 · Sab 9:00–13:00', 'MM2 Cadorna – 3 min', 'https://maps.google.com/?q=Via+Torino+42+Milano');
    insertSede.run('Milano Nord',   'Viale Monza 88, 20127 Milano',  '02 3456 7890', 'Lun–Ven 8:30–18:30 · Sab 9:00–13:00', 'MM1 Pasteur – 5 min',  'https://maps.google.com/?q=Viale+Monza+88+Milano');
    insertSede.run('Sesto S. Giovanni', 'Via Matteotti 15, 20099 Sesto S.G.', '02 2345 6789', 'Lun–Ven 9:00–18:00 · Sab 9:00–12:00', 'MM1 Sesto Marelli – 2 min', 'https://maps.google.com/?q=Via+Matteotti+15+Sesto+San+Giovanni');
    console.log('✅  Sedi di default inserite');
  }

  /* ── Seed: pacchetti di default ─────────────────────────────── */
  const pacchettiCount = db.prepare('SELECT COUNT(*) as n FROM pacchetti').get().n;
  if (pacchettiCount === 0) {
    const insertPacchetto = db.prepare(`
      INSERT INTO pacchetti (nome, licenza, prezzo, descrizione, features, in_evidenza)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPacchetto.run(
      'Patente B', 'Auto · Guida Normale', 850,
      'Il corso base per ottenere la patente di guida',
      JSON.stringify(['Esame teorico completo', '30 ore di guida pratica', 'Materiale didattico digitale', 'Test simulati online', 'Supporto istruttore dedicato']),
      0
    );
    insertPacchetto.run(
      'Patente B Plus', 'Auto · Guida Intensiva', 1150,
      'Il corso intensivo con priorità all\'esame',
      JSON.stringify(['Esame teorico + pratico', '50 ore di guida pratica', 'Simulatore di guida avanzato', 'Test simulati illimitati', 'Lezioni flessibili su prenotazione', 'Prenotazione esame prioritaria']),
      1
    );
    insertPacchetto.run(
      'Patente A/AM', 'Moto · Tutti i livelli', 700,
      'Tutti i livelli di patente moto',
      JSON.stringify(['Teoria dedicata moto', 'Guida su circuito chiuso', 'Tecnica di guida avanzata', 'Equipaggiamento in dotazione', 'AM · A1 · A2 · A disponibili']),
      0
    );
    console.log('✅  Pacchetti di default inseriti');
  }

  console.log('🗄️   Database pronto →', DB_PATH);
  return db;
}

module.exports = { getDB, initDB };
