/**
 * src/controllers/instagramController.js
 * Gestion des DMs Instagram et curation des avis.
 */

const prisma  = require('../lib/db');
const igLib   = require('../lib/instagram');

// ──────────────────────────────────────────────────────────────
// POST /api/instagram/token
// Échange un short-lived token contre un long-lived token.
// Body: { shortLivedToken, pageId }
// ──────────────────────────────────────────────────────────────
exports.saveToken = async (req, res, next) => {
  try {
    const { shortLivedToken, pageId } = req.body;
    if (!shortLivedToken) return res.status(400).json({ error: 'shortLivedToken requis' });

    const result = await igLib.exchangeForLongLivedToken(shortLivedToken);

    // Sauvegarder le pageId si fourni
    if (pageId) {
      await prisma.instagramToken.update({
        where: { id: 'singleton' },
        data: { pageId },
      });
    }

    res.json({
      message: 'Token configuré avec succès',
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/instagram/status
// Retourne l'état du token configuré.
// ──────────────────────────────────────────────────────────────
exports.getStatus = async (req, res, next) => {
  try {
    const record = await prisma.instagramToken.findUnique({ where: { id: 'singleton' } });

    if (!record) return res.json({ configured: false });

    const daysLeft = Math.floor((record.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    res.json({
      configured: true,
      expiresAt: record.expiresAt,
      daysLeft,
      pageId: record.pageId,
      isExpired: record.expiresAt < new Date(),
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/instagram/sync
// Récupère les DMs Instagram et les importe dans la BDD
// (source = "instagram", isPublished = false) sans doublons.
// ──────────────────────────────────────────────────────────────
exports.syncDMs = async (req, res, next) => {
  try {
    const pageId = await igLib.getPageId();
    if (!pageId) return res.status(400).json({ error: 'PAGE_ID non configuré' });

    const conversations = await igLib.fetchConversations(pageId);

    let imported = 0;
    let skipped  = 0;

    for (const conversation of conversations) {
      const messages = conversation.messages?.data || [];

      for (const msg of messages) {
        // Ignorer les messages vides ou de la page elle-même
        if (!msg.message || msg.from?.id === pageId) continue;

        // Vérifier si ce message est déjà en BDD (via instagramMessageId unique)
        const existing = await prisma.testimonial.findUnique({
          where: { instagramMessageId: msg.id },
        });

        if (existing) { skipped++; continue; }

        // Récupérer l'avatar (best-effort)
        const { avatar, username } = await igLib.fetchUserAvatar(msg.from?.id);

        await prisma.testimonial.create({
          data: {
            authorName:         username || msg.from?.name || 'Utilisateur Instagram',
            content:            msg.message,
            originalContent:    msg.message,
            rating:             5,
            isPublished:        false,          // En attente de curation admin
            source:             'instagram',
            instagramMessageId: msg.id,
            instagramUsername:  username || msg.from?.name,
            instagramAvatar:    avatar || null,
          },
        });

        imported++;
      }
    }

    res.json({ message: `Synchronisation terminée`, imported, skipped });
  } catch (error) {
    // Si le token n'est pas configuré, retourner un message clair
    if (error.message?.includes('token')) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/instagram/inbox
// Retourne les DMs Instagram en attente de modération (admin).
// ──────────────────────────────────────────────────────────────
exports.getInbox = async (req, res, next) => {
  try {
    const messages = await prisma.testimonial.findMany({
      where: {
        source: 'instagram',
        isPublished: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/instagram/approved
// Retourne les avis Instagram approuvés (admin).
// ──────────────────────────────────────────────────────────────
exports.getApproved = async (req, res, next) => {
  try {
    const messages = await prisma.testimonial.findMany({
      where: {
        source: 'instagram',
        isPublished: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/instagram/approve/:id
// Approuve un DM et le publie (avec contenu éventuellement modifié).
// Body: { content, authorRole, rating }
// ──────────────────────────────────────────────────────────────
exports.approve = async (req, res, next) => {
  try {
    const { content, authorRole, rating } = req.body;

    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: {
        content:    content || undefined,     // Contenu édité (ou original si non modifié)
        authorRole: authorRole || 'Client Instagram',
        rating:     rating ? Number(rating) : 5,
        isPublished: true,
      },
    });

    res.json({ message: 'Avis approuvé et publié', testimonial });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Message introuvable' });
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/instagram/reject/:id
// Rejette définitivement un DM (suppression BDD).
// ──────────────────────────────────────────────────────────────
exports.reject = async (req, res, next) => {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ message: 'Message rejeté et supprimé' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Message introuvable' });
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// POST /api/instagram/manual
// Crée un avis Instagram manuellement (saisie admin depuis un DM lu sur l'app).
// Body: { instagramUsername, content, rating, authorRole, publishNow }
// ──────────────────────────────────────────────────────────────
exports.createManual = async (req, res, next) => {
  try {
    const { instagramUsername, content, rating, authorRole, publishNow } = req.body;

    if (!instagramUsername || !content) {
      return res.status(400).json({ error: 'instagramUsername et content sont requis' });
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        authorName:        instagramUsername,
        content:           content.trim(),
        originalContent:   content.trim(),
        rating:            rating ? Number(rating) : 5,
        isPublished:       publishNow === true,
        source:            'instagram',
        instagramUsername: instagramUsername.replace(/^@/, ''),
        authorRole:        authorRole || 'Client Instagram',
      },
    });

    res.json({ message: 'Avis ajouté', testimonial });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// DELETE /api/instagram/unpublish/:id
// Retire un avis approuvé (remet isPublished = false).
// ──────────────────────────────────────────────────────────────
exports.unpublish = async (req, res, next) => {
  try {
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: { isPublished: false },
    });
    res.json({ message: 'Avis retiré de la publication', testimonial });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Message introuvable' });
    next(error);
  }
};
