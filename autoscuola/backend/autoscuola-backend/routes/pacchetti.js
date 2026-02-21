const express = require('express');
const { body, validationResult } = require('express-validator');

const { getDB }      = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ── GET /api/pacchetti ─────────────────────────────────────── */
/* Pubblica: restituisce i pacchetti attivi                      */
router.get('/', (req, res) => {
  const db   = getDB();
  const rows = db.prepare('SELECT * FROM pacchetti WHERE attivo = 1 ORDER BY in_evidenza DESC, prezzo ASC').all();

  /* Parsa features da JSON string */
  const data = rows.map(p => ({ ...p, features: JSON.parse(p.features || '[]') }));
  res.json({ success: true, data });
});

/* ── GET /api/pacchetti/:id ─────────────────────────────────── */
router.get('/:id', (req, res) => {
  const db  = getDB();
  const row = db.prepare('SELECT * FROM pacchetti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Pacchetto non trovato' });
  res.json({ success: true, data: { ...row, features: JSON.parse(row.features || '[]') } });
});

/* ── POST /api/pacchetti ── (admin) ─────────────────────────── */
router.post(
  '/',
  authMiddleware,
  [
    body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
    body('licenza').trim().notEmpty().withMessage('Licenza obbligatoria'),
    body('prezzo').isFloat({ min: 0 }).withMessage('Prezzo non valido'),
    body('features').optional().isArray().withMessage('Features deve essere un array'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { nome, licenza, prezzo, descrizione, features, in_evidenza } = req.body;
    const db = getDB();

    const result = db.prepare(`
      INSERT INTO pacchetti (nome, licenza, prezzo, descrizione, features, in_evidenza)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      nome, licenza, prezzo,
      descrizione || null,
      JSON.stringify(features || []),
      in_evidenza ? 1 : 0
    );

    res.status(201).json({ success: true, message: 'Pacchetto creato', id: result.lastInsertRowid });
  }
);

/* ── PUT /api/pacchetti/:id ── (admin) ──────────────────────── */
router.put(
  '/:id',
  authMiddleware,
  [
    body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
    body('licenza').trim().notEmpty().withMessage('Licenza obbligatoria'),
    body('prezzo').isFloat({ min: 0 }).withMessage('Prezzo non valido'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const db  = getDB();
    const row = db.prepare('SELECT id FROM pacchetti WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Pacchetto non trovato' });

    const { nome, licenza, prezzo, descrizione, features, in_evidenza, attivo } = req.body;

    db.prepare(`
      UPDATE pacchetti SET nome=?, licenza=?, prezzo=?, descrizione=?, features=?, in_evidenza=?, attivo=?
      WHERE id=?
    `).run(
      nome, licenza, prezzo,
      descrizione || null,
      JSON.stringify(features || []),
      in_evidenza ? 1 : 0,
      attivo !== undefined ? (attivo ? 1 : 0) : 1,
      req.params.id
    );

    res.json({ success: true, message: 'Pacchetto aggiornato' });
  }
);

/* ── DELETE /api/pacchetti/:id ── (admin) ───────────────────── */
router.delete('/:id', authMiddleware, (req, res) => {
  const db  = getDB();
  const row = db.prepare('SELECT id FROM pacchetti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: 'Pacchetto non trovato' });

  /* Soft delete */
  db.prepare('UPDATE pacchetti SET attivo = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Pacchetto disattivato' });
});

module.exports = router;
