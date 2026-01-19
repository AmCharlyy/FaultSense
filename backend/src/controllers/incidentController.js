const incidentService = require('../services/incidentService');

const getIncidents = async (req, res) => {
    try {
        const result = await incidentService.getAllIncidents(req.query);
        res.json(result);
    } catch (error) {
        // Manejo de error de índice faltante (muy común al filtrar en Firestore)
        if (error.code === 9 || error.message.includes('requires an index')) {
            const linkMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            return res.status(400).json({ 
                error: 'Falta índice en base de datos.',
                link: linkMatch ? linkMatch[0] : null
            });
        }
        res.status(500).json({ error: 'Error obteniendo incidentes' });
    }
};

const createIncident = async (req, res) => {
    try {
        const result = await incidentService.createIncident(req.body, req.user.uid);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateIncident = async (req, res) => {
    try {
        const result = await incidentService.updateIncident(req.params.id, req.body, req.user.uid);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteIncident = async (req, res) => {
    try {
        await incidentService.deleteIncident(req.params.id);
        res.status(200).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getIncidents, createIncident, updateIncident, deleteIncident };