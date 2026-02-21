const express = require('express');
const { getDB }      = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* ── GET /api/admin/dashboard ───────────────────────────────── */
/* Panoramica generale per il pannello admin                     */
router.get('/dashboard', authMiddleware, (req, res) => {
  const db = getDB();

  const stats = {
    iscrizioni: {
      totale:     db.prepare("SELECT COUNT(*) AS n FROM iscrizioni").get().n,
      nuove:      db.prepare("SELECT COUNT(*) AS n FROM iscrizioni WHERE stato='nuova'").get().n,
      confermate: db.prepare("SELECT COUNT(*) AS n FROM iscrizioni WHERE stato='confermata'").get().n,
      completate: db.prepare("SELECT COUNT(*) AS n FROM iscrizioni WHERE stato='completata'").get().n,
      annullate:  db.prepare("SELECT COUNT(*) AS n FROM iscrizioni WHERE stato='annullata'").get().n,
    },
    feedback: {
      totale:       db.prepare("SELECT COUNT(*) AS n FROM feedback").get().n,
      in_attesa:    db.prepare("SELECT COUNT(*) AS n FROM feedback WHERE approvato=0").get().n,
      approvati:    db.prepare("SELECT COUNT(*) AS n FROM feedback WHERE approvato=1").get().n,
      media_voto:   db.prepare("SELECT ROUND(AVG(valutazione),1) AS m FROM feedback WHERE approvato=1").get().m,
    },
    pacchetti: {
      totale: db.prepare("SELECT COUNT(*) AS n FROM pacchetti WHERE attivo=1").get().n,
    },
    sedi: {
      totale: db.prepare("SELECT COUNT(*) AS n FROM sedi WHERE attiva=1").get().n,
    },
  };

  /* Ultime 5 iscrizioni */
  stats.ultime_iscrizioni = db.prepare(`
    SELECT i.id, i.nome, i.cognome, i.email, i.stato, i.created_at,
           p.nome AS pacchetto_nome, s.citta AS sede_citta
    FROM iscrizioni i
    LEFT JOIN pacchetti p ON i.pacchetto_id = p.id
    LEFT JOIN sedi s      ON i.sede_id = s.id
    ORDER BY i.created_at DESC LIMIT 5
  `).all();

  /* Iscrizioni per pacchetto */
  stats.iscrizioni_per_pacchetto = db.prepare(`
    SELECT p.nome, COUNT(i.id) AS totale
    FROM pacchetti p
    LEFT JOIN iscrizioni i ON p.id = i.pacchetto_id
    WHERE p.attivo = 1
    GROUP BY p.id
    ORDER BY totale DESC
  `).all();

  res.json({ success: true, data: stats });
});

module.exports = router;
