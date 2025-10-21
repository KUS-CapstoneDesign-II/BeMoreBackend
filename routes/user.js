const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');

router.get('/preferences', ctrl.getPreferences);
router.put('/preferences', ctrl.setPreferences);

module.exports = router;


