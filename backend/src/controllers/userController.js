const userService = require('../services/userService');

const getProfile = async (req, res) => {
    try {
        const profile = await userService.getProfile(req.user);
        res.json(profile);
    } catch (error) {
        console.error("Error Profile:", error);
        res.status(500).json({ error: 'Error obteniendo perfil' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const result = await userService.updateProfile(req.user.uid, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getProfile, updateProfile };