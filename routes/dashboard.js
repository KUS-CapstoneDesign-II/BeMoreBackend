const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');

router.get('/summary', ctrl.summary);

module.exports = router;


