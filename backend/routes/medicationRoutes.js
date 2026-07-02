const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/medicationController');

router.get('/',         ctrl.getMedications);
router.post('/',        ctrl.addMedication);
router.put('/:id',      ctrl.updateMedication);
router.delete('/:id',   ctrl.deleteMedication);
router.get('/today',    ctrl.todaySchedule);

module.exports = router;
