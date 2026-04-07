// src/routes/upload.js
const router = require('express').Router();
const multer = require('multer');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadToCloudinary } = require('../lib/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont acceptées'));
    }
    cb(null, true);
  },
});

router.post('/', authenticate, requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const { url } = await uploadToCloudinary(req.file.buffer, 'ghf-uploads');
    res.status(201).json({ url });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
