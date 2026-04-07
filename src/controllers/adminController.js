// src/controllers/adminController.js
const prisma = require('../lib/db');

// GET /api/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const [users, events, reservations, gallery, contests, revenueAgg, recentReservations, upcomingEvents] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.reservation.count(),
      prisma.gallery.count(),
      prisma.contest.count({ where: { isActive: true } }),
      prisma.reservation.aggregate({
        _sum: { totalPrice: true },
        where: { status: 'CONFIRMED' },
      }),
      prisma.reservation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } }, event: { select: { title: true } } }
      }),
      prisma.event.findMany({
        where: { date: { gte: new Date() } },
        take: 5,
        orderBy: { date: 'asc' },
        include: { _count: { select: { reservations: true } } }
      })
    ]);

    const revenue = revenueAgg._sum.totalPrice || 0;

    // Performance des revenus : 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const rawRevenueSeries = await prisma.reservation.findMany({
      where: { 
        status: 'CONFIRMED',
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true, totalPrice: true },
      orderBy: { createdAt: 'asc' }
    });

    // Grouper par jour pour Recharts
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const revenueMap = {};
    
    // Initialiser les 7 derniers jours à 0
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      revenueMap[dateStr] = { name: dayNames[d.getDay()], revenus: 0, reservations: 0 };
    }

    rawRevenueSeries.forEach(res => {
      const dateStr = res.createdAt.toISOString().split('T')[0];
      if (revenueMap[dateStr]) {
        revenueMap[dateStr].revenus += res.totalPrice;
        revenueMap[dateStr].reservations += 1;
      }
    });

    const revenueSeries = Object.values(revenueMap);

    res.json({
      users,
      events,
      reservations,
      gallery,
      contests,
      revenue,
      revenueSeries,
      recentReservations,
      upcomingEvents: upcomingEvents.map(e => ({
        ...e,
        reservationsCount: e._count.reservations,
        _count: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { reservations: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id/role
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });
    res.json({ message: 'Rôle mis à jour avec succès', user });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur introuvable' });
    next(error);
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur introuvable' });
    next(error);
  }
};

// GET /api/admin/gallery
exports.listGallery = async (req, res, next) => {
  try {
    const items = await prisma.gallery.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        event: { select: { title: true } }
      }
    });

    const formatted = items.map(item => ({
      ...item,
      user_name: item.user?.name || 'Administrateur',
      status: item.status.toLowerCase()
    }));

    res.json({ data: formatted });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/gallery/:id/status
exports.updateGalleryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const dbStatus = status.toUpperCase();
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(dbStatus)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    const item = await prisma.gallery.update({
      where: { id: req.params.id },
      data: { 
        status: dbStatus,
        isPublished: dbStatus === 'APPROVED'
      }
    });
    res.json(item);
  } catch (error) {
    next(error);
  }
};
