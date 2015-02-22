
module.exports = function (mongoose) {

    return function (req, res, next) {

        if (req.toCache) {
            var body = req.body;
            var string = JSON.stringify(body);

            var crypto = require('crypto');
            var shasum = crypto.createHash('sha1');
            shasum.update(string);

            var key = shasum.digest('hex');
            var redis = req.redis;

            console.log('setting cache key ' + key);
            var data = req.cache_data;
            data = JSON.stringify(data);
            redis.hset(key, 'data', data, function (err, response) {
                redis.expire(key, 60 * 30);
            });
            res.json({
                error: 0,
                data: req.cache_data
            });

        } else {

            var body = req.body;
            var string = JSON.stringify(body);

            var crypto = require('crypto');
            var shasum = crypto.createHash('sha1');
            shasum.update(string);

            var key = shasum.digest('hex');
            var redis = req.redis;

            console.log('checking cache key ' + key);
            redis.exists(key, function (err, response) {
                if (response === 1) {
                    redis.hget(key, 'data', function (err, data) {
                        if (data) {
                            try {
                                var json = JSON.parse(data);
                                console.log('setting data via redis cache');
                                res.json({
                                    error: 0,
                                    data: json
                                });
                            } catch (e) {
                                next();
                            }
                        }
                    });
                } else {
                    next();
                }
            });
        }

    };
};