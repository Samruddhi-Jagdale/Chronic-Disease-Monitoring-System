const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/healthController');

router.post('/submit',  ctrl.submitHealth);
router.get('/history',  ctrl.getHistory);
router.get('/latest',   ctrl.getLatestReport);

module.exports = router;
