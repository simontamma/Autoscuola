const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { getDB }  = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'autoscuola_secret_cambia_in_produzione';
const JWT_EXPIRY = process.env.JWT_EXPIRY  || '8h';

/* ── POST /api/auth/login ───────────────────────────────────── */
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username obbligatorio'),
    body('password').notEmpty().withMessage('Password obbligatoria'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { username, password } = req.body;
    const db    = getDB();
    const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);

    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ success: false, message: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({ success: true, token, username: admin.username });
  }
);

/* ── GET /api/auth/me ───────────────────────────────────────── */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

/* ── PUT /api/auth/password ─────────────────────────────────── */
router.put(
  '/password',
  authMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('Password attuale obbligatoria'),
    body('newPassword').isLength({ min: 6 }).withMessage('La nuova password deve avere almeno 6 caratteri'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    const db    = getDB();
    const admin = db.prepare('SELECT * FROM admin WHERE id = ?').get(req.admin.id);

    if (!bcrypt.compareSync(currentPassword, admin.password)) {
      return res.status(401).json({ success: false, message: 'Password attuale non corretta' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE admin SET password = ? WHERE id = ?').run(hash, req.admin.id);

    res.json({ success: true, message: 'Password aggiornata con successo' });
  }
);

module.exports = router;
