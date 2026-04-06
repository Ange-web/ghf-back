// src/controllers/testimonialController.js
const prisma = require('../lib/db');

// GET /api/testimonials
exports.listTestimonials = async (req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { avatar: true } } },
    });
    res.json(testimonials);
  } catch (error) {
    next(error);
  }
};

// POST /api/testimonials
exports.createTestimonial = async (req, res, next) => {
  try {
    const testimonial = await prisma.testimonial.create({
      data: {
        userId: req.user.id,
        authorName: req.user.name,
        content: req.body.content,
        rating: req.body.rating,
        isPublished: false, // En attente de modération
      },
    });
    res.status(201).json({ message: 'Avis soumis, en attente de validation', testimonial });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/testimonials/:id/publish
exports.togglePublish = async (req, res, next) => {
  try {
    const { isPublished } = req.body;
    const t = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: { isPublished },
    });
    res.json(t);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Avis introuvable' });
    next(error);
  }
};
