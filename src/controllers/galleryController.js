// src/controllers/galleryController.js
const prisma = require('../lib/db');
const { uploadToR2, deleteFromR2, getPresignedUploadUrl } = require('../lib/r2');

// GET /api/gallery
exports.listGallery = async (req, res, next) => {
  try {
    const { eventId, page = 1, limit = 20 } = req.query;
    const where = { isPublished: true };
    if (eventId) where.eventId = eventId;

    const [items, total] = await Promise.all([
      prisma.gallery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { event: { select: { id: true, title: true } } },
      }),
      prisma.gallery.count({ where }),
    ]);

    res.json({ data: items, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    next(error);
  }
};

// POST /api/gallery/upload
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

    const { key, url } = await uploadToR2(req.file.buffer, req.file.originalname, 'gallery');
    const { caption, eventId } = req.body;

    const item = await prisma.gallery.create({
      data: { url, r2Key: key, caption, eventId: eventId || null },
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// GET /api/gallery/presigned
exports.getPresignedUrl = async (req, res, next) => {
  try {
    const { fileName } = req.query;
    if (!fileName) return res.status(400).json({ error: 'fileName requis' });
    const result = await getPresignedUploadUrl(fileName, 'gallery');
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/gallery/:id
exports.deleteImage = async (req, res, next) => {
  try {
    const item = await prisma.gallery.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Image introuvable' });

    if (item.r2Key) {
      await deleteFromR2(item.r2Key);
    }
    await prisma.gallery.delete({ where: { id: req.params.id } });
    res.json({ message: 'Image supprimée' });
  } catch (error) {
    next(error);
  }
};
