const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const admin = require("firebase-admin"); // <--- 1. IMPORTAR ADMIN

// 2. INICIALIZAR FIREBASE ADMIN (Solo una vez aquí)
// Reemplaza 'fault-sense.firebasestorage.app' con tu bucket real si es diferente
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: "fault-sense.firebasestorage.app" 
});

// Importar rutas y middlewares
const apiRoutes = require('./src/routes/api');
const errorHandler = require('./src/middlewares/errorMiddleware');

const app = express();

// Configuración Global
app.use(cors({ origin: true }));
app.use(helmet());
app.use(express.json({ limit: '50mb' })); // Ya tienes esto, ¡perfecto para las fotos!
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas
app.use('/api', apiRoutes);

// Manejador de errores global
app.use(errorHandler);

console.log("🔥 Backend Profesional Cargado Correctamente");

exports.api = onRequest({ region: "us-central1" }, app);