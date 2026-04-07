// src/controllers/eventController.js
const prisma = require('../lib/db');
const { sendToTopic } = require('../lib/fcm');

// GET /api/events
exports.listEvents = async (req, res, next) => {
  try {
    const { featured, tag, upcoming, page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { isPublished: true };
    if (featured === 'true') where.isFeatured = true;
    if (upcoming === 'true') where.date = { gte: new Date() };
    if (tag) where.tags = { has: tag };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { date: 'asc' },
        skip,
        take: Number(limit),
        include: {
          _count: { select: { reservations: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      data: events.map(e => ({
        ...e,
        reservationsCount: e._count.reservations,
        spotsLeft: e.capacity - e._count.reservations,
        _count: undefined,
      })),
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/:id
exports.getEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        gallery: { where: { isPublished: true }, take: 6 },
        _count: { select: { reservations: true } },
      },
    });
    if (!event) return res.status(404).json({ error: 'Événement introuvable' });

    res.json({
      ...event,
      reservationsCount: event._count.reservations,
      spotsLeft: event.capacity - event._count.reservations,
      _count: undefined,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/events
exports.createEvent = async (req, res, next) => {
  try {
    const { 
      has_table_promo, table_promo_price, table_promo_capacity,
      has_table_vip, table_vip_price, table_vip_capacity,
      image_url, 
      id, createdAt, updatedAt, reservationsCount, spotsLeft, _count,
      ...rest 
    } = req.body;

    const event = await prisma.event.create({ 
      data: {
        ...rest,
        imageUrl: image_url || rest.imageUrl,
        hasTablePromo: has_table_promo,
        tablePromoPrice: Number(table_promo_price || 0),
        tablePromoCapacity: Number(table_promo_capacity || 0),
        hasTableVip: has_table_vip,
        tableVipPrice: Number(table_vip_price || 0),
        tableVipCapacity: Number(table_vip_capacity || 0)
      } 
    });

    // Notifier tous les abonnés FCM
    if (event.isPublished) {
      await sendToTopic({
        topic: 'new-events',
        title: `🎉 Nouvel événement : ${event.title}`,
        body: `${event.venue} • ${new Date(event.date).toLocaleDateString('fr-FR')}`,
        data: { url: `/events/${event.id}`, eventId: event.id },
      });
    }

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

// PUT /api/events/:id
exports.updateEvent = async (req, res, next) => {
  try {
    const { 
      has_table_promo, table_promo_price, table_promo_capacity,
      has_table_vip, table_vip_price, table_vip_capacity,
      image_url, 
      id, createdAt, updatedAt, reservationsCount, spotsLeft, _count,
      ...rest 
    } = req.body;

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        imageUrl: image_url || rest.imageUrl,
        hasTablePromo: has_table_promo,
        tablePromoPrice: Number(table_promo_price || 0),
        tablePromoCapacity: Number(table_promo_capacity || 0),
        hasTableVip: has_table_vip,
        tableVipPrice: Number(table_vip_price || 0),
        tableVipCapacity: Number(table_vip_capacity || 0)
      },
    });
    res.json(event);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Événement introuvable' });
    next(error);
  }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res, next) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Événement supprimé' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Événement introuvable' });
    next(error);
  }
};
