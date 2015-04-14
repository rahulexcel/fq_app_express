var uid = require('uid-safe')

module.exports = function () {

    var auth = {};
    auth.authenticate = function (req, done) {
        var Auth = req.Auth;
        var body = req.body;
        var api_key = body.api_key;
        var digest = body.digest;
        var data = body.data;
        if (!req.auth) {
            if (api_key && digest && data) {
                req.body = data;
            }
            done(true);
        } else {
            if (body) {
                if (api_key && digest && data) {
                    var timestamp = data.timestamp;
                    var current_time = new Date().getTime();
                    console.log('Auth Timestamp ' + current_time);
                    if (current_time - timestamp > 15 * 60 * 1000) {
                        done(false, 'Request Older Than 15 Minutes');
                    } else {
                        Auth.findOne({
                            api_key: api_key
                        }, function (err, row) {
                            if (err) {
                                done(false, err);
                            } else {
                                if (row) {

                                    var api_secret = row.get('api_secret');
                                    var crypto = require('crypto');
                                    console.log('App Secret ' + api_secret);
                                    var hash = crypto.createHmac('sha1', api_secret).update(JSON.stringify(data)).digest('hex')
                                    console.log('App Hash ' + digest);

                                    if (hash === digest) {
                                        req.body = data;
                                        done(true);
                                    } else {
                                        done(false, 'Data Tampered! Restart Your Application');
                                    }

                                } else {
                                    done(false, 'API Key Not Found');
                                }
                            }
                        });
                    }
                } else {
                    done(false, 'Invalid Request');
                }

            } else {
                done(true);
            }
        }
    }
    auth.removeAuth = function (api_key, req, res, next) {
        var Auth = req.Auth;
        Auth.findOne({
            api_key: api_key
        }, function (err, row) {
            if (err) {
                next(err);
            } else if (row) {
                Auth.remove({
                    api_key: api_key
                }, function (err) {
                    if (err) {
                        next(err);
                    } else {
                        res.json({
                            error: 0
                        });
                    }
                });
            } else {
                res.json({
                    error: 0
                });
            }
        })
    }
    auth.createAuth = function (user_id, device, req, done) {

        var api_secret = uid.sync(18);
        var api_key = uid.sync(6);

        var Auth = req.Auth;

        var model = new Auth({
            user_id: user_id,
            device: device,
            api_secret: api_secret,
            api_key: api_key
        });
        model.save(function (err) {
            if (err) {
                done(err);
            } else {
                if (done) {
                    done(null, {
                        api_key: api_key,
                        api_secret: api_secret
                    });
                }
            }
        });

    };
    return function (req, res, next) {
        req.auth_strategy = auth;
        auth.authenticate(req, function (is_valid, msg) {
            if (is_valid) {
                next();
            } else {
                res.json({
                    error: 3,
                    message: msg
                });
            }
        });
    }
}