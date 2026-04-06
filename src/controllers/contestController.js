// src/controllers/contestController.js
const prisma = require('../lib/db');

// GET /api/contests
exports.listContests = async (req, res, next) => {
  try {
    const contests = await prisma.contest.findMany({
      where: { isActive: true },
      orderBy: { endDate: 'asc' },
      include: { _count: { select: { participations: true } } },
    });
    res.json(contests.map(c => ({ ...c, participantsCount: c._count.participations, _count: undefined })));
  } catch (error) {
    next(error);
  }
};

// GET /api/contests/:id
exports.getContest = async (req, res, next) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { participations: true } } },
    });
    if (!contest) return res.status(404).json({ error: 'Concours introuvable' });
    res.json({ ...contest, participantsCount: contest._count.participations, _count: undefined });
  } catch (error) {
    next(error);
  }
};

// POST /api/contests/:id/participate
exports.participate = async (req, res, next) => {
  try {
    const contest = await prisma.contest.findUnique({ where: { id: req.params.id } });
    if (!contest) return res.status(404).json({ error: 'Concours introuvable' });
    if (!contest.isActive) return res.status(400).json({ error: 'Concours terminé' });
    if (new Date() > contest.endDate) return res.status(400).json({ error: 'Concours expiré' });

    const participation = await prisma.contestParticipation.create({
      data: { userId: req.user.id, contestId: req.params.id, answer: req.body.answer },
    });
    res.json({ message: 'Participation enregistrée ! Bonne chance 🎉', participation });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Vous participez déjà à ce concours' });
    next(error);
  }
};

// POST /api/contests
exports.createContest = async (req, res, next) => {
  try {
    const contest = await prisma.contest.create({ data: req.body });
    res.status(201).json(contest);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/contests/:id
exports.deleteContest = async (req, res, next) => {
  try {
    await prisma.contest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Concours supprimé' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Concours introuvable' });
    next(error);
  }
};
