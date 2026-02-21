require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { initDB } = require('./db/database');

const authRoutes       = require('./routes/auth');
const feedbackRoutes   = require('./routes/feedback');
const iscrizioniRoutes = require('./routes/iscrizioni');
const pacchettRoutes   = require('./routes/pacchetti');
const sediRoutes       = require('./routes/sedi');
const adminRoutes      = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ─────────────────────────────────────────────── */
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Serve frontend statico (opzionale) ─────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── Routes ─────────────────────────────────────────────────── */
app.use('/api/auth',       authRoutes);
app.use('/api/feedback',   feedbackRoutes);
app.use('/api/iscrizioni', iscrizioniRoutes);
app.use('/api/pacchetti',  pacchettRoutes);
app.use('/api/sedi',       sediRoutes);
app.use('/api/admin',      adminRoutes);

/* ── Health check ───────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── Error handler globale ──────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Errore interno del server',
  });
});

/* ── Avvio ──────────────────────────────────────────────────── */
initDB();
app.listen(PORT, () => {
  console.log(`\n🚗  AutoScuola Veloce – Backend avviato`);
  console.log(`📡  http://localhost:${PORT}`);
  console.log(`📋  Docs: http://localhost:${PORT}/api/health\n`);
});
