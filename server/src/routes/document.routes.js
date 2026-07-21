const express = require('express');

const router = express.Router();

const {
    home,
    uploadDocument,
    createCollection,
    getDocumentStatus,
    listDocuments,
    deleteDocument,
} = require('../controllers/document.controllers.js');
const { askQuestion, listQueries } = require('../controllers/query.controllers.js');
const upload = require('../middlewares/upload.middlewares.js');
const { authenticate } = require('../middlewares/auth.middlewares.js');

router.get('/', home);

router.get('/create-collection', authenticate, createCollection);

router.post('/upload', authenticate, upload.array('pdfs', 10), uploadDocument);

// Polling endpoints - the client uses these to find out when a queued PDF is ready.
router.get('/documents', authenticate, listDocuments);
router.get('/documents/:id', authenticate, getDocumentStatus);
router.delete('/documents/:id', authenticate, deleteDocument);

// Ask a question. Body: { question, documentId? , collectionId? }
// documentId   -> search one document
// collectionId -> search every ready document in that collection
// neither      -> search everything the user owns
router.post('/query', authenticate, askQuestion);
router.get('/queries', authenticate, listQueries);

module.exports = router;
