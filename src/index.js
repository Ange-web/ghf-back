// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { cacheControl } = require('./middleware/cache');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const reservationRoutes = require('./routes/reservations');
const galleryRoutes = require('./routes/gallery');
const contestRoutes = require('./routes/contests');
const testimonialRoutes = require('./routes/testimonials');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const instagramRoutes = require('./routes/instagram');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Compression ───────────────────────────────────────────
app.use(compression({
  level: 6,           // bon compromis vitesse/compression
  threshold: 1024,    // ne compresser que les réponses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ── Sécurité ──────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Si l'origine n'est pas définie (ex: Postman) ou si elle est autorisée
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, false); // N'autorise pas, mais ne crashe pas, laisse passer ou bloque proprement
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion.' },
});
app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health check ──────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    message: 'GHF Agency API',
    version: '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', cacheControl(60, 120), eventRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/gallery', cacheControl(60, 120), galleryRoutes);
app.use('/api/contests', cacheControl(60, 120), contestRoutes);
app.use('/api/testimonials', cacheControl(120, 300), testimonialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/instagram', instagramRoutes);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 GHF Agency API démarrée`);
  console.log(`📍 http://localhost:${PORT}/api`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}\n`);
});
