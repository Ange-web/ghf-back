// src/middleware/validate.js
const { z } = require('zod');

/**
 * Middleware de validation avec Zod
 * Usage: router.post('/route', validate(schema), controller)
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Données invalides',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      next(error);
    }
  };
}

// ── Schémas de validation ─────────────────────────────────

const schemas = {
  register: z.object({
    name: z.string().min(2, 'Nom trop court').max(100),
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Minimum 8 caractères'),
  }),

  login: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
  }),

  event: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10),
    date: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    venue: z.string().min(2),
    address: z.string().optional(),
    price: z.number().min(0).default(0),
    capacity: z.number().int().min(1),
    imageUrl: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    isFeatured: z.boolean().default(false),
    isPublished: z.boolean().default(true),
  }),

  reservation: z.object({
    eventId: z.string().uuid('ID événement invalide'),
    guests: z.number().int().min(1).max(20).default(1),
    phone: z.string().optional(),
    specialRequests: z.string().max(500).optional(),
  }),

  gallery: z.object({
    url: z.string().url(),
    r2Key: z.string().optional(),
    caption: z.string().max(200).optional(),
    eventId: z.string().uuid().optional().nullable(),
  }),

  contest: z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10),
    prize: z.string().optional(),
    imageUrl: z.string().url().optional(),
    endDate: z.string().datetime(),
  }),

  contestParticipation: z.object({
    answer: z.string().max(500).optional(),
  }),

  testimonial: z.object({
    content: z.string().min(10).max(1000),
    rating: z.number().int().min(1).max(5).default(5),
  }),
};

module.exports = { validate, schemas };
