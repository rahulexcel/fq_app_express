
module.exports = function (mongoose) {

    return function (req, res, next) {

        if (req.toCache) {
            var data = req.body;
            if (data.timestamp) {
                delete data.timestamp;
            }
            var string = JSON.stringify(data);
            var req_url = req.originalUrl;

            var crypto = require('crypto');
            var shasum = crypto.createHash('sha1');

            shasum.update(string + req_url);

            var key = shasum.digest('hex');
            var redis = req.redis;

            console.log('setting cache key ' + key);
            var data = req.cache_data;
            data = JSON.stringify(data);
            redis.hset(key, 'data', data, function (err, response) {
                if (err) {
                    console.log(err);
                }
                //setting cache for 1hr. this can be easily increase
                redis.expire(key, 60 * 60 * 60);
            });
            res.json({
                error: 0,
                data: req.cache_data
            });

        } else {
            if (req.cache) {
                var data = req.body;
                if (data.timestamp) {
                    delete data.timestamp;
                }
                var string = JSON.stringify(data);

                var crypto = require('crypto');
                var shasum = crypto.createHash('sha1');

                var req_url = req.originalUrl;

                shasum.update(string + req_url);

                var key = shasum.digest('hex');
                var redis = req.redis;

                console.log('checking cache key ' + key);
                redis.hexists(key, 'data', function (err, response) {
                    console.log('response ' + response);
                    if (err) {
                        console.log(err);
                    }
                    if (response === 1) {
                        redis.hget(key, 'data', function (err, data) {
                            if (err) {
                                console.log(err);
                            }
                            if (data) {
                                try {
                                    var json = JSON.parse(data);
                                    console.log('getting data via redis cache');
                                    res.json({
                                        error: 0,
                                        data: json,
                                        is_cache: true
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
            } else {
                next();
            }


        }

    };
};