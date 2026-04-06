// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../lib/db');

/**
 * Vérifie le token JWT et attache req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant ou invalide' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });

    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré, reconnectez-vous' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

/**
 * Vérifie que l'utilisateur est admin
 */
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Accès réservé aux admins' });
  next();
}

/**
 * Middleware optionnel (ne bloque pas si pas de token)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    req.user = user || null;
    next();
  } catch {
    next();
  }
}

module.exports = { authenticate, requireAdmin, optionalAuth };
