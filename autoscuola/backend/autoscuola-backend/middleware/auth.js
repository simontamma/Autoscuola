const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'autoscuola_secret_cambia_in_produzione';

/**
 * Middleware: verifica il token JWT nell'header Authorization.
 * Uso:  Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token mancante o non valido' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token scaduto o non valido' });
  }
}

module.exports = authMiddleware;
