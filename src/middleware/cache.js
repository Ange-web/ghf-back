// src/middleware/cache.js
// Middleware pour ajouter des headers de cache HTTP sur les routes GET publiques

/**
 * Ajoute des headers Cache-Control sur les réponses GET.
 * @param {number} maxAge — durée du cache navigateur en secondes (défaut: 60)
 * @param {number} sMaxAge — durée du cache CDN/proxy en secondes (défaut: 120)
 */
function cacheControl(maxAge = 60, sMaxAge = 120) {
  return (req, res, next) => {
    // Seulement les GET, pas les requêtes authentifiées
    if (req.method === 'GET' && !req.headers.authorization) {
      res.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=300`);
    } else if (req.method === 'GET') {
      // Requêtes authentifiées : cache privé court
      res.set('Cache-Control', 'private, max-age=10');
    } else {
      res.set('Cache-Control', 'no-store');
    }
    next();
  };
}

module.exports = { cacheControl };
