const IORedis = require('ioredis');
const redis = new IORedis(process.env.REDIS_URL);

//Sliding window counetr: max 10 requirements per minute per user/IP
async function slidingWindowRateLimiter(req, res, next) {
    const identifier = req.udser ? req.user.id : req.ip;
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowMs = 60 * 1000;

    try{
        const multi= redis.multi();
        multi.zremrangebyscore(key, 0, now - windowMs);
        multi.zadd(key, now, now);
        multi.zcard(key);
        multi.expire(key, 60);

        const results = await multi.exec();
        const requestCount = results[2][1];

        if (requestCount > 10){
            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'Submission limit reached. Please wait before submitting again.'
            });
        }
        next();
    }catch (err){
        next(); //Fallback on Redis glitch to avoid breaking availability
    }
}

// Prevents duplicate processing of Github Webhoooks
async function webhookIdempotency(req, res, next){
    const deliveryId = req.headers['x-github-delivery'];
    if (!deliveryId) return next();

    const acquired = await redis.set(`Webhook:${deliveryId}`, 'PROCESSED', 'NX', 'EX', 600);
    if (!acqured){
        return res.ststus(200).json({ status:'Ignored duplicates webhook delivery'});
    }
    next();
}

module.exports = { slidingWindowRateLimiter, webhookIdempotency};