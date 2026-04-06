// src/lib/fcm.js
const admin = require('firebase-admin');

let firebaseApp;

function getFirebaseApp() {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  return firebaseApp;
}

/**
 * Envoyer une notification à un token FCM spécifique
 */
async function sendNotification({ token, title, body, data = {} }) {
  try {
    const app = getFirebaseApp();
    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      token,
      webpush: {
        notification: { icon: '/icons/icon-192x192.png', badge: '/icons/badge-72x72.png' },
        fcmOptions: { link: data.url || '/' },
      },
    };
    const response = await admin.messaging(app).send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('FCM send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer à plusieurs tokens (multicast)
 */
async function sendMulticastNotification({ tokens, title, body, data = {} }) {
  if (!tokens?.length) return;
  try {
    const app = getFirebaseApp();
    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      tokens,
    };
    const response = await admin.messaging(app).sendEachForMulticast(message);
    console.log(`📲 FCM: ${response.successCount}/${tokens.length} envoyés`);
    return response;
  } catch (error) {
    console.error('FCM multicast error:', error.message);
  }
}

/**
 * Envoyer à un topic (ex: "new-events")
 */
async function sendToTopic({ topic, title, body, data = {} }) {
  try {
    const app = getFirebaseApp();
    await admin.messaging(app).send({
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      topic,
    });
  } catch (error) {
    console.error('FCM topic error:', error.message);
  }
}

module.exports = { sendNotification, sendMulticastNotification, sendToTopic };
