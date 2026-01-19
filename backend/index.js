const { onRequest } = require("firebase-functions/v2/https");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Importar rutas y middlewares
const apiRoutes = require('./src/routes/api');
const errorHandler = require('./src/middlewares/errorMiddleware'); // <--- IMPORTAR AQUÍ

const app = express();

// Configuración Global
app.use(cors({ origin: true }));
app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas
app.use('/api', apiRoutes);

// Manejador de errores global (Usando el archivo separado)
app.use(errorHandler); // <--- USAR AQUÍ

console.log("🔥 Backend Profesional Cargado Correctamente");

exports.api = onRequest(app);