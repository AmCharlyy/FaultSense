const admin = require('firebase-admin');
const { setGlobalOptions } = require("firebase-functions/v2");

// Configuración global de Cloud Functions v2
setGlobalOptions({ region: "us-central1", memory: "256MiB", maxInstances: 10 });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        // 👇 IMPORTANTE: Agregamos el bucket que vimos en tu consola
        storageBucket: "fault-sense.firebasestorage.app" 
    });
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket(); // 👈 ESTO FALTABA

// 👇 Agregamos 'bucket' a la exportación
module.exports = { admin, db, auth, bucket };