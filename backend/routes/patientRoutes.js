const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/patientController');

router.post('/',    ctrl.savePatient);
router.get('/me',   ctrl.getPatient);

module.exports = router;
