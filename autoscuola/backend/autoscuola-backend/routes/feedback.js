const express = require('express');
const { body, query, validationResult } = require('express-validator');

const { getDB }      = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ── GET /api/feedback ──────────────────────────────────────── */
/* Pubblica: restituisce solo i feedback approvati               */
router.get('/', (req, res) => {
  const db   = getDB();
  const sede = req.query.sede_id ? parseInt(req.query.sede_id) : null;

  let sql    = `
    SELECT f.*, s.citta AS sede_citta
    FROM feedback f
    LEFT JOIN sedi s ON f.sede_id = s.id
    WHERE f.approvato = 1
  `;
  const params = [];

  if (sede) { sql += ' AND f.sede_id = ?'; params.push(sede); }
  sql += ' ORDER BY f.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ success: true, data: rows });
});

/* ── GET /api/feedback/stats ────────────────────────────────── */
router.get('/stats', (req, res) => {
  const db = getDB();
  const stats = db.prepare(`
    SELECT
      COUNT(*) AS totale,
      ROUND(AVG(valutazione), 1) AS media,
      SUM(CASE WHEN valutazione = 5 THEN 1 ELSE 0 END) AS cinque_stelle,
      SUM(CASE WHEN valutazione = 4 THEN 1 ELSE 0 END) AS quattro_stelle,
      SUM(CASE WHEN valutazione = 3 THEN 1 ELSE 0 END) AS tre_stelle,
      SUM(CASE WHEN valutazione = 2 THEN 1 ELSE 0 END) AS due_stelle,
      SUM(CASE WHEN valutazione = 1 THEN 1 ELSE 0 END) AS una_stella
    FROM feedback WHERE approvato = 1
  `).get();
  res.json({ success: true, data: stats });
});

/* ── POST /api/feedback ─────────────────────────────────────── */
/* Pubblica: crea un nuovo feedback (richiede approvazione)      */
router.post(
  '/',
  [
    body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
    body('cognome').trim().notEmpty().withMessage('Cognome obbligatorio'),
    body('email').isEmail().withMessage('Email non valida'),
    body('valutazione').isInt({ min: 1, max: 5 }).withMessage('Valutazione tra 1 e 5'),
    body('testo').trim().isLength({ min: 10 }).withMessage('Il feedback deve contenere almeno 10 caratteri'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { nome, cognome, email, sede_id, valutazione, testo } = req.body;
    const db = getDB();

    const result = db.prepare(`
      INSERT INTO feedback (nome, cognome, email, sede_id, valutazione, testo)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nome, cognome, email, sede_id || null, valutazione, testo);

    res.status(201).json({
      success: true,
      message: 'Feedback inviato! Sarà pubblicato dopo la revisione.',
      id: result.lastInsertRowid,
    });
  }
);

/* ── PATCH /api/feedback/:id/approva ── (admin) ─────────────── */
router.patch('/:id/approva', authMiddleware, (req, res) => {
  const db = getDB();
  const fb = db.prepare('SELECT id FROM feedback WHERE id = ?').get(req.params.id);
  if (!fb) return res.status(404).json({ success: false, message: 'Feedback non trovato' });

  db.prepare('UPDATE feedback SET approvato = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Feedback approvato' });
});

/* ── DELETE /api/feedback/:id ── (admin) ─────────────────────── */
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const fb = db.prepare('SELECT id FROM feedback WHERE id = ?').get(req.params.id);
  if (!fb) return res.status(404).json({ success: false, message: 'Feedback non trovato' });

  db.prepare('DELETE FROM feedback WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Feedback eliminato' });
});

/* ── GET /api/feedback/admin/tutti ── (admin) ────────────────── */
/* Tutti i feedback, inclusi quelli non approvati               */
router.get('/admin/tutti', authMiddleware, (req, res) => {
  const db   = getDB();
  const rows = db.prepare(`
    SELECT f.*, s.citta AS sede_citta
    FROM feedback f
    LEFT JOIN sedi s ON f.sede_id = s.id
    ORDER BY f.approvato ASC, f.created_at DESC
  `).all();
  res.json({ success: true, data: rows });
});

module.exports = router;
