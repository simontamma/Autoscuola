const express = require('express');
const { body, validationResult } = require('express-validator');

const { getDB }      = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ── GET /api/sedi ──────────────────────────────────────────── */
/* Pubblica                                                      */
router.get('/', (req, res) => {
  const db   = getDB();
  const rows = db.prepare('SELECT * FROM sedi WHERE attiva = 1 ORDER BY id ASC').all();
  res.json({ success: true, data: rows });
});

/* ── GET /api/sedi/:id ──────────────────────────────────────── */
router.get('/:id', (req, res) => {
  const db  = getDB();
  const row = db.prepare('SELECT * FROM sedi WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Sede non trovata' });
  res.json({ success: true, data: row });
});

/* ── POST /api/sedi ── (admin) ──────────────────────────────── */
router.post(
  '/',
  authMiddleware,
  [
    body('citta').trim().notEmpty().withMessage('Città obbligatoria'),
    body('indirizzo').trim().notEmpty().withMessage('Indirizzo obbligatorio'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { citta, indirizzo, telefono, orari, metro, maps_url } = req.body;
    const db = getDB();

    const result = db.prepare(`
      INSERT INTO sedi (citta, indirizzo, telefono, orari, metro, maps_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(citta, indirizzo, telefono || null, orari || null, metro || null, maps_url || null);

    res.status(201).json({ success: true, message: 'Sede aggiunta', id: result.lastInsertRowid });
  }
);

/* ── PUT /api/sedi/:id ── (admin) ───────────────────────────── */
router.put(
  '/:id',
  authMiddleware,
  [
    body('citta').trim().notEmpty().withMessage('Città obbligatoria'),
    body('indirizzo').trim().notEmpty().withMessage('Indirizzo obbligatorio'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const db  = getDB();
    const row = db.prepare('SELECT id FROM sedi WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Sede non trovata' });

    const { citta, indirizzo, telefono, orari, metro, maps_url, attiva } = req.body;

    db.prepare(`
      UPDATE sedi SET citta=?, indirizzo=?, telefono=?, orari=?, metro=?, maps_url=?, attiva=?
      WHERE id=?
    `).run(
      citta, indirizzo,
      telefono || null, orari || null, metro || null, maps_url || null,
      attiva !== undefined ? (attiva ? 1 : 0) : 1,
      req.params.id
    );

    res.json({ success: true, message: 'Sede aggiornata' });
  }
);

/* ── DELETE /api/sedi/:id ── (admin) ────────────────────────── */
router.delete('/:id', authMiddleware, (req, res) => {
  const db  = getDB();
  const row = db.prepare('SELECT id FROM sedi WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Sede non trovata' });

  db.prepare('UPDATE sedi SET attiva = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Sede disattivata' });
});

module.exports = router;
