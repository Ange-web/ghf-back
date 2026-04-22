// src/routes/instagram.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/instagramController');

// Toutes les routes nécessitent une authentification admin
router.use(authenticate, requireAdmin);

// Configuration du token Meta
router.post('/token',        ctrl.saveToken);   // Échange short → long-lived token
router.get('/status',        ctrl.getStatus);   // État du token configuré

// Synchronisation & curation
router.get('/sync',          ctrl.syncDMs);     // Importe les nouveaux DMs depuis Meta
router.get('/inbox',         ctrl.getInbox);    // DMs en attente de modération
router.get('/approved',      ctrl.getApproved); // Avis approuvés (vue admin)

// Saisie manuelle (DM lu sur l'app, retranscrit par l'admin)
router.post('/manual',        ctrl.createManual);

// Actions de modération
router.post('/approve/:id',   ctrl.approve);    // Approuver + éditer + publier
router.post('/reject/:id',    ctrl.reject);     // Rejeter (supprime)
router.delete('/unpublish/:id', ctrl.unpublish);// Retirer de la publication

module.exports = router;
