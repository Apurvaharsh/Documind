const express = require('express');
const { requireClerkAuth } = require('../middlewares/auth.middlewares.js');
const {
    createApiKey,
    listApiKeys,
    revokeApiKey,
} = require('../controllers/apikey.controllers.js');

const router = express.Router();

router.use(requireClerkAuth);

router.post('/', createApiKey);
router.get('/', listApiKeys);
router.delete('/:id', revokeApiKey);

module.exports = router;
