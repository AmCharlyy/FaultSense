const ncPartsService = require('../services/ncPartsService');

const getParts = async (req, res) => {
    try {
        const parts = await ncPartsService.getAllParts();
        res.json(parts);
    } catch (error) {
        // Manejo específico del error de índice faltante
        if (error.code === 9 || error.message.includes('requires an index')) {
            return res.status(400).json({ error: 'Falta índice en NC-PARTS.' });
        }
        res.status(500).json({ error: error.message });
    }
};

const createPart = async (req, res) => {
    try {
        const result = await ncPartsService.createPart(req.body, req.user.uid);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updatePart = async (req, res) => {
    try {
        const result = await ncPartsService.updatePart(req.params.id, req.body, req.user.uid);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deletePart = async (req, res) => {
    try {
        await ncPartsService.deletePart(req.params.id);
        res.status(200).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getParts, createPart, updatePart, deletePart };