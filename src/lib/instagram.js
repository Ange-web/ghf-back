/**
 * src/lib/instagram.js
 * Client Meta Graph API pour la gestion des DMs Instagram.
 *
 * Flux d'authentification :
 *   1. L'admin génère un Short-lived Token (1h) via Meta for Developers
 *   2. POST /api/instagram/token  →  échange en Long-lived Token (60 jours)
 *   3. Un cron renouvelle le token avant expiration (tous les 50 jours)
 *
 * Permissions Meta requises :
 *   - instagram_manage_messages  (lire les DMs)
 *   - instagram_basic             (infos du compte)
 *   - pages_messaging             (accès via Page Facebook liée)
 *
 * ⚠️  Ces permissions nécessitent une Business Verification Meta
 *     et une revue d'application (délai ~1–2 semaines).
 */

const axios = require('axios');
const prisma = require('./db');

const GRAPH_URL = 'https://graph.facebook.com/v19.0';
const APP_ID     = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

// ──────────────────────────────────────────────────────────────
// Token management
// ──────────────────────────────────────────────────────────────

/**
 * Échange un Short-lived Token (1h) contre un Long-lived Token (60 jours).
 * À appeler une fois depuis le dashboard admin lors du setup initial.
 */
async function exchangeForLongLivedToken(shortLivedToken) {
  const { data } = await axios.get(`${GRAPH_URL}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: APP_ID,
      client_secret: APP_SECRET,
      fb_exchange_token: shortLivedToken,
    },
  });

  // data = { access_token, token_type, expires_in (secondes) }
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  // Upsert : on ne garde qu'un seul token (id = "singleton")
  await prisma.instagramToken.upsert({
    where: { id: 'singleton' },
    update: { accessToken: data.access_token, expiresAt },
    create: { id: 'singleton', accessToken: data.access_token, expiresAt },
  });

  return { accessToken: data.access_token, expiresAt };
}

/**
 * Renouvelle le Long-lived Token existant (valide 60 jours depuis le renouvellement).
 * Doit être appelé AVANT expiration (idéalement tous les 50 jours via cron).
 *
 * Exemple de cron (à ajouter dans index.js ou un scheduler) :
 *   setInterval(refreshTokenIfNeeded, 24 * 60 * 60 * 1000); // vérif. quotidienne
 */
async function refreshTokenIfNeeded() {
  const record = await prisma.instagramToken.findUnique({ where: { id: 'singleton' } });
  if (!record) return null;

  const daysLeft = (record.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);

  // Renouvellement si moins de 10 jours restants
  if (daysLeft > 10) return record.accessToken;

  const { data } = await axios.get(`${GRAPH_URL}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: APP_ID,
      client_secret: APP_SECRET,
      fb_exchange_token: record.accessToken,
    },
  });

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.instagramToken.update({
    where: { id: 'singleton' },
    data: { accessToken: data.access_token, expiresAt },
  });

  console.log(`[Instagram] Token renouvelé. Expire le ${expiresAt.toLocaleDateString()}`);
  return data.access_token;
}

/**
 * Récupère le token actif depuis la BDD.
 * Lance une erreur si aucun token n'est configuré.
 */
async function getActiveToken() {
  const record = await prisma.instagramToken.findUnique({ where: { id: 'singleton' } });
  if (!record) throw new Error('Aucun token Instagram configuré. Configurez-le depuis le dashboard admin.');
  if (record.expiresAt < new Date()) throw new Error('Token Instagram expiré. Veuillez le renouveler.');
  return record.accessToken;
}

// ──────────────────────────────────────────────────────────────
// API Instagram
// ──────────────────────────────────────────────────────────────

/**
 * Récupère les conversations (threads) DM de l'Instagram Business Account.
 * L'IG Business Account doit être lié à une Page Facebook.
 *
 * Graph API : GET /{page-id}/conversations?platform=instagram
 */
async function fetchConversations(pageId) {
  const token = await getActiveToken();

  const { data } = await axios.get(`${GRAPH_URL}/${pageId}/conversations`, {
    params: {
      platform: 'instagram',
      fields: 'participants,messages{message,from,created_time,id}',
      access_token: token,
    },
  });

  return data.data || [];
}

/**
 * Récupère les messages d'une conversation spécifique.
 */
async function fetchMessages(conversationId) {
  const token = await getActiveToken();

  const { data } = await axios.get(`${GRAPH_URL}/${conversationId}/messages`, {
    params: {
      fields: 'id,message,from,created_time',
      access_token: token,
    },
  });

  return data.data || [];
}

/**
 * Récupère l'avatar d'un utilisateur Instagram.
 * Optionnel — peut échouer selon les permissions de l'utilisateur.
 */
async function fetchUserAvatar(instagramUserId) {
  try {
    const token = await getActiveToken();
    const { data } = await axios.get(`${GRAPH_URL}/${instagramUserId}`, {
      params: { fields: 'profile_pic,username', access_token: token },
    });
    return { avatar: data.profile_pic, username: data.username };
  } catch {
    return { avatar: null, username: null };
  }
}

/**
 * Récupère le Page ID Facebook lié au compte Instagram Business.
 * Nécessaire pour appeler /conversations.
 */
async function getPageId() {
  const record = await prisma.instagramToken.findUnique({ where: { id: 'singleton' } });
  return record?.pageId || process.env.META_PAGE_ID;
}

module.exports = {
  exchangeForLongLivedToken,
  refreshTokenIfNeeded,
  getActiveToken,
  fetchConversations,
  fetchMessages,
  fetchUserAvatar,
  getPageId,
};
