const express = require('express');
const documentRoutes = require('./src/routes/document.routes.js');
const apiKeyRoutes = require('./src/routes/apikey.routes.js');
const collectionRoutes = require('./src/routes/collection.routes.js');

const app = express();
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    return next();
});

app.use(express.json());

app.use('/api/keys', apiKeyRoutes);
app.use('/collections', collectionRoutes);
app.use('/',documentRoutes);

module.exports = app;
