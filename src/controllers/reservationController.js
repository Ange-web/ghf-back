// src/controllers/reservationController.js
const prisma = require('../lib/db');

// POST /api/reservations
exports.createReservation = async (req, res, next) => {
  try {
    const { eventId, guests, phone, specialRequests } = req.body;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { reservations: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Événement introuvable' });
    if (!event.isPublished) return res.status(400).json({ error: 'Événement non disponible' });

    const spotsLeft = event.capacity - event._count.reservations;
    if (guests > spotsLeft) {
      return res.status(400).json({ error: `Plus assez de places (${spotsLeft} disponibles)` });
    }

    // Vérifier réservation existante
    const existing = await prisma.reservation.findFirst({
      where: { userId: req.user.id, eventId, status: { not: 'CANCELLED' } },
    });
    if (existing) return res.status(409).json({ error: 'Vous avez déjà une réservation pour cet événement' });

    const reservation = await prisma.reservation.create({
      data: {
        userId: req.user.id,
        eventId,
        guests,
        phone: phone || req.user.phone,
        specialRequests,
        totalPrice: event.price * guests,
        status: 'CONFIRMED',
      },
      include: {
        event: { select: { title: true, date: true, venue: true } },
      },
    });

    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
};

// GET /api/reservations/my
exports.getMyReservations = async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user.id },
      include: { event: { select: { id: true, title: true, date: true, venue: true, imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reservations);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/reservations/:id
exports.cancelReservation = async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
    if (reservation.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ message: 'Réservation annulée' });
  } catch (error) {
    next(error);
  }
};

// GET /api/reservations — Admin
exports.listAll = async (req, res, next) => {
  try {
    const { eventId, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, title: true, date: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.reservation.count({ where }),
    ]);

    res.json({ data: reservations, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/reservations/:id/status — Admin
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status },
      include: { user: { select: { name: true, email: true } } },
    });
    res.json(reservation);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Réservation introuvable' });
    next(error);
  }
};
