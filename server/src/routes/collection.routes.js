const express = require('express');
const { authenticate } = require('../middlewares/auth.middlewares.js');
const {
    createCollection,
    listCollections,
    addDocumentsToCollection,
    deleteCollection,
} = require('../controllers/collection.controllers.js');

const router = express.Router();

// Every route here needs a signed-in user - collections are per-user.
router.use(authenticate);

router.post('/', createCollection);
router.get('/', listCollections);
router.patch('/:id/documents', addDocumentsToCollection);
router.delete('/:id', deleteCollection);

module.exports = router;
