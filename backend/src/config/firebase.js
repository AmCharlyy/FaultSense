const admin = require('firebase-admin');
const { setGlobalOptions } = require("firebase-functions/v2");

// Configuración global de Cloud Functions v2
setGlobalOptions({ region: "us-central1", memory: "256MiB", maxInstances: 10 });

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };