// src/controllers/notificationController.js
const { sendNotification, sendToTopic } = require('../lib/fcm');

// POST /api/notifications/subscribe
exports.subscribe = async (req, res, next) => {
  try {
    const { token, topics = ['new-events'] } = req.body;
    if (!token) return res.status(400).json({ error: 'Token FCM requis' });

    // Dans un vrai projet : stocker le token en BDD et s'abonner aux topics
    // Pour l'instant on confirme juste la réception
    res.json({ message: 'Notifications activées', topics });
  } catch (error) {
    next(error);
  }
};

// POST /api/notifications/send — Admin
exports.sendManual = async (req, res, next) => {
  try {
    const { token, topic, title, body, data } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title et body requis' });

    if (token) {
      const result = await sendNotification({ token, title, body, data });
      return res.json(result);
    }
    if (topic) {
      await sendToTopic({ topic, title, body, data });
      return res.json({ message: `Notification envoyée au topic: ${topic}` });
    }
    return res.status(400).json({ error: 'token ou topic requis' });
  } catch (error) {
    next(error);
  }
};
