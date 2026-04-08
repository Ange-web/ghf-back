// src/controllers/galleryController.js
const prisma = require('../lib/db');
const { uploadToCloudinary, deleteFromCloudinary } = require('../lib/cloudinary');

// GET /api/gallery
exports.listGallery = async (req, res, next) => {
  try {
    const { eventId, page = 1, limit = 12 } = req.query;
    const where = { isPublished: true };
    if (eventId) where.eventId = eventId;

    const [items, total] = await Promise.all([
      prisma.gallery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          url: true,
          caption: true,
          eventId: true,
          createdAt: true,
          event: { select: { id: true, title: true } },
        },
      }),
      prisma.gallery.count({ where }),
    ]);

    res.json({ data: items, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    next(error);
  }
};

// GET /api/gallery/my — photos submitted by the authenticated user
exports.getMyGallery = async (req, res, next) => {
  try {
    const items = await prisma.gallery.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { event: { select: { id: true, title: true } } },
    });
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
};

// POST /api/gallery/upload
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'ghf-gallery');
    const { caption, eventId } = req.body;

    const item = await prisma.gallery.create({
      data: {
        url,
        cloudinaryId: publicId,
        caption,
        eventId: eventId || null,
        userId: req.user?.id || null,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// POST /api/gallery (create from URL — no file upload)
exports.createFromUrl = async (req, res, next) => {
  try {
    const { url, caption, eventId } = req.body;
    if (!url) return res.status(400).json({ error: 'URL requise' });

    const item = await prisma.gallery.create({
      data: {
        url,
        caption: caption || null,
        eventId: eventId || null,
        userId: req.user?.id || null,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/gallery/:id
exports.deleteImage = async (req, res, next) => {
  try {
    const item = await prisma.gallery.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Image introuvable' });

    if (item.cloudinaryId) {
      await deleteFromCloudinary(item.cloudinaryId);
    }
    await prisma.gallery.delete({ where: { id: req.params.id } });
    res.json({ message: 'Image supprimée' });
  } catch (error) {
    next(error);
  }
};
