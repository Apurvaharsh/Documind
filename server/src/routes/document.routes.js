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
const { getUsage } = require('../controllers/usage.controllers.js');
const {
    listConversations,
    getConversation,
    deleteConversation,
} = require('../controllers/conversation.controllers.js');
const upload = require('../middlewares/upload.middlewares.js');
const { authenticate } = require('../middlewares/auth.middlewares.js');
const { queryLimiter, uploadLimiter } = require('../middlewares/ratelimit.middlewares.js');

router.get('/', home);

router.get('/create-collection', authenticate, createCollection);

router.post('/upload', authenticate, uploadLimiter, upload.array('pdfs', 10), uploadDocument);

// Polling endpoints - the client uses these to find out when a queued PDF is ready.
router.get('/documents', authenticate, listDocuments);
router.get('/documents/:id', authenticate, getDocumentStatus);
router.delete('/documents/:id', authenticate, deleteDocument);

// Ask a question. Body: { question, documentId? , collectionId? }
// documentId   -> search one document
// collectionId -> search every ready document in that collection
// neither      -> search everything the user owns
router.post('/query', authenticate, queryLimiter, askQuestion);
router.get('/queries', authenticate, listQueries);
router.get('/usage', authenticate, getUsage);

// Chat threads
router.get('/conversations', authenticate, listConversations);
router.get('/conversations/:id', authenticate, getConversation);
router.delete('/conversations/:id', authenticate, deleteConversation);

module.exports = router;
