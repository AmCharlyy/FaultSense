const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');
const { db } = require('../config/firebase');

// Importar Controladores
const dashboardController = require('../controllers/dashboardController');
const incidentController = require('../controllers/incidentController');
const ncPartsController = require('../controllers/ncPartsController');
const userController = require('../controllers/userController');

// Middleware de Autenticación
router.use(verifyToken);

// --- DASHBOARD ---
router.get('/dashboard/metrics', dashboardController.getMetrics);

// --- INCIDENTES (CRUD COMPLETO) ---
router.get('/incidents', incidentController.getIncidents);
router.post('/incidents', incidentController.createIncident);
router.put('/incidents/:id', incidentController.updateIncident); // Ruta actualizada
router.delete('/incidents/:id', incidentController.deleteIncident); // Ruta actualizada

// --- NC PARTS (SCHADENTISCH) ---
router.get('/nc-parts', ncPartsController.getParts);
router.post('/nc-parts', ncPartsController.createPart);
router.put('/nc-parts/:id', ncPartsController.updatePart);
router.delete('/nc-parts/:id', ncPartsController.deletePart);

// --- PERFIL DE USUARIO ---
router.get('/user/profile', userController.getProfile);
router.put('/user/profile', userController.updateProfile);

// --- FILTROS Y OPCIONES ---
router.get('/clients', async (req, res) => {
    try {
        const snapshot = await db.collection('incidents').select('client').get();
        const clientsSet = new Set();
        snapshot.forEach(doc => { if (doc.data().client) clientsSet.add(doc.data().client) });
        res.json(Array.from(clientsSet).map(name => ({ name })));
    } catch (e) { res.status(500).json({ error: e.message }) }
});

router.get('/origins', async (req, res) => {
    try {
        const snapshot = await db.collection('incidents').select('origin').get();
        const originsSet = new Set();
        snapshot.forEach(doc => { if (doc.data().origin) originsSet.add(doc.data().origin) });
        res.json(Array.from(originsSet).map(name => ({ name })));
    } catch (e) { res.status(500).json({ error: e.message }) }
});

module.exports = router;