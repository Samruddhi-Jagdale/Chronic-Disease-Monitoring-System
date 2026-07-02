const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/aiController');

router.post('/chat',           ctrl.chat);
router.get('/chat/history',    ctrl.getChatHistory);
router.delete('/chat/history', ctrl.clearChat);
router.get('/lifestyle',       ctrl.getLifestyleRecommendations);

module.exports = router;
