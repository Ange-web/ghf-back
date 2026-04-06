// src/routes/gallery.js
const router = require('express').Router();
const multer = require('multer');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/galleryController');

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

router.get('/', ctrl.listGallery);
router.post('/upload', authenticate, requireAdmin, upload.single('image'), ctrl.uploadImage);
router.get('/presigned', authenticate, requireAdmin, ctrl.getPresignedUrl);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteImage);

module.exports = router;
