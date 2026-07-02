const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.post('/logout',   ctrl.logout);
router.get('/session',   ctrl.checkSession);

module.exports = router;
