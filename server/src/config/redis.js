const Redis = require('ioredis');

const redis = new Redis({
    host:process.env.REDIS_HOST,
    port:process.env.REDIS_PORT,
    maxRetriesPerRequest:null,
});

redis.on('connect',() => {
    console.log("Redis Connected");
});

redis.on('error',(err) => {
    console.error("Error while connecting to redis is : ",err);
});

module.exports = redis;