// Entry point for the background worker.
// This runs as a SEPARATE process from server.js:
//
//   Terminal 1:  node server.js   <- answers HTTP requests, returns fast
//   Terminal 2:  node worker.js   <- chews through PDFs in the background
//
// They talk to each other only through Redis (the BullMQ queue), which is why
// a slow PDF can no longer block an upload request.
require('dotenv').config();

const documentWorker = require('./src/workers/document.worker.js');

console.log('Document worker started, waiting for jobs...');

// Ctrl+C should let the job that is currently running finish first,
// instead of killing it halfway through and leaving a stuck PROCESSING row.
async function shutdown() {
    console.log('\nShutting down worker...');
    await documentWorker.close();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
