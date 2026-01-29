const express = require('express');
const router = express.Router();
const cloudController = require('../controllers/cloudController');

// Definición de endpoints
router.post('/upload', cloudController.uploadFile);
router.get('/', cloudController.getFiles);      // GET /api/cloud?userId=...
router.delete('/:id', cloudController.deleteFile);
router.post('/delete-bulk', cloudController.bulkDelete);

module.exports = router;