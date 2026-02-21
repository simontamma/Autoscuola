const express = require('express');
const { body, validationResult } = require('express-validator');

const { getDB }      = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ── POST /api/iscrizioni ───────────────────────────────────── */
/* Pubblica: nuova iscrizione dal form del sito                 */
router.post(
  '/',
  [
    body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
    body('cognome').trim().notEmpty().withMessage('Cognome obbligatorio'),
    body('email').isEmail().withMessage('Email non valida'),
    body('telefono').optional().isMobilePhone('it-IT').withMessage('Numero di telefono non valido'),
    body('pacchetto_id').optional().isInt().withMessage('Pacchetto non valido'),
    body('sede_id').optional().isInt().withMessage('Sede non valida'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { nome, cognome, email, telefono, data_nascita, pacchetto_id, sede_id, note } = req.body;
    const db = getDB();

    /* Controlla duplicati per email */
    const esistente = db.prepare(
      "SELECT id FROM iscrizioni WHERE email = ? AND stato NOT IN ('annullata', 'completata')"
    ).get(email);
    if (esistente) {
      return res.status(409).json({
        success: false,
        message: 'Esiste già un\'iscrizione attiva con questa email',
      });
    }

    const result = db.prepare(`
      INSERT INTO iscrizioni (nome, cognome, email, telefono, data_nascita, pacchetto_id, sede_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nome, cognome, email, telefono || null, data_nascita || null, pacchetto_id || null, sede_id || null, note || null);

    res.status(201).json({
      success: true,
      message: 'Iscrizione ricevuta! Ti contatteremo presto.',
      id: result.lastInsertRowid,
    });
  }
);

/* ── GET /api/iscrizioni ── (admin) ─────────────────────────── */
router.get('/', authMiddleware, (req, res) => {
  const db    = getDB();
  const stato = req.query.stato;

  let sql    = `
    SELECT i.*, p.nome AS pacchetto_nome, s.citta AS sede_citta
    FROM iscrizioni i
    LEFT JOIN pacchetti p ON i.pacchetto_id = p.id
    LEFT JOIN sedi s      ON i.sede_id = s.id
  `;
  const params = [];
  if (stato) { sql += ' WHERE i.stato = ?'; params.push(stato); }
  sql += ' ORDER BY i.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows, totale: rows.length });
});

/* ── GET /api/iscrizioni/:id ── (admin) ─────────────────────── */
router.get('/:id', authMiddleware, (req, res) => {
  const db  = getDB();
  const row = db.prepare(`
    SELECT i.*, p.nome AS pacchetto_nome, s.citta AS sede_citta
    FROM iscrizioni i
    LEFT JOIN pacchetti p ON i.pacchetto_id = p.id
    LEFT JOIN sedi s      ON i.sede_id = s.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!row) return res.status(404).json({ success: false, message: 'Iscrizione non trovata' });
  res.json({ success: true, data: row });
});

/* ── PATCH /api/iscrizioni/:id/stato ── (admin) ─────────────── */
router.patch(
  '/:id/stato',
  authMiddleware,
  [body('stato').isIn(['nuova', 'confermata', 'completata', 'annullata']).withMessage('Stato non valido')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const db  = getDB();
    const row = db.prepare('SELECT id FROM iscrizioni WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Iscrizione non trovata' });

    db.prepare('UPDATE iscrizioni SET stato = ? WHERE id = ?').run(req.body.stato, req.params.id);
    res.json({ success: true, message: `Stato aggiornato a "${req.body.stato}"` });
  }
);

/* ── DELETE /api/iscrizioni/:id ── (admin) ──────────────────── */
router.delete('/:id', authMiddleware, (req, res) => {
  const db  = getDB();
  const row = db.prepare('SELECT id FROM iscrizioni WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Iscrizione non trovata' });

  db.prepare('DELETE FROM iscrizioni WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Iscrizione eliminata' });
});

module.exports = router;
