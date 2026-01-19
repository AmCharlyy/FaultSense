const dashboardService = require('../services/dashboardService');

const getMetrics = async (req, res) => {
    try {
        const metrics = await dashboardService.getMetrics();
        res.json(metrics);
    } catch (error) {
        console.error("Error Dashboard:", error);
        res.status(500).json({ error: 'Error calculando métricas' });
    }
};

module.exports = { getMetrics };