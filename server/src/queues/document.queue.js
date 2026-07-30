const {Queue} = require('bullmq');
const redis = require('../config/redis');

const documentQueue = new Queue("document-processing",{
    connection:redis,
    defaultJobOptions:{
        attempts:3,
        backoff:{
            type:"exponential",
            delay:5000,
        },
        removeOnComplete:100,
        removeOnFail:50
    },
});

module.exports = documentQueue;