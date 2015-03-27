var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');


router.all('/get_alerts', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var user_watch_map = req.user_watch_map;

    var page = 0;
    if (body.page) {
        page = body.page;
    }
    if (user_id) {
        user_watch_map.find({
            user_id: user_id,
            for_fashion_iq: true
        }).skip(page * 10).limit(10).lean().exec(function (err, data) {
            if (err) {
                next(err);
            } else {
                res.json({
                    error: 0,
                    data: data
                });
            }
        });
    } else {
        res.json({
            error: 0,
            message: 'Invalid Request'
        });
    }
});

router.all('/register', function (req, res, next) {
    var body = req.body;

    var user_id = body.user_id;
    var reg_id = body.reg_id;
    var device = body.device;


    var model = '';
    if (device.model) {
        model = device.model;
    }

    var GCM = req.GCM;

    if (user_id && reg_id && device) {
        GCM.findOne({
            user_id: user_id,
            'device.model': model
        }, function (err, gcm_row) {
            if (err) {
                next(err);
            } else if (gcm_row && gcm_row._id) {
                GCM.update({
                    _id: gcm_row._id
                }, {
                    $set: {
                        reg_id: reg_id,
                        device: device
                    }
                }, function (err) {
                    if (err) {
                        next(err);
                    } else {
                        res.json({
                            error: 0
                        });
                    }
                })
            } else {
                var new_gcm = new GCM({
                    user_id: user_id,
                    reg_id: reg_id,
                    device: device
                });
                new_gcm.save(function (err) {
                    if (err) {
                        next(err);
                    } else {
                        res.json({error: 0});
                    }
                });
            }

        });
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});

router.all('/alert', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var data = body.data;
    var expiry = body.expiry;


    var gcm = require('node-gcm');
    var message = new gcm.Message({
//        collapseKey: 'demo',
        delayWhileIdle: true,
        timeToLive: expiry,
        data: data
    });

    var GCM = req.GCM;
    var registrationIds = [];

    var where = {};
    console.log(typeof user_id);
    if (typeof user_id !== 'string') {
        where = {
            user_id: {$in: user_id}
        };
    } else {
        where = {
            user_id: user_id
        };
    }
    GCM.find(where, function (err, rows) {
        if (err) {
            next(err);
        } else {
            for (var i = 0; i < rows.length; i++) {
                registrationIds.push(rows[i].reg_id);
            }
            console.log(registrationIds);
            var sender = new gcm.Sender('AIzaSyABDceQztvkstpKksCz86-hQAFeshqoBV4');

            console.log(data.meta);
            if (data.meta && data.meta.type && data.meta.type == 'item_add') {
                pushItemToUserFeed(data.meta.item_id, user_id, req);
            }

            sender.send(message, registrationIds, 1, function (err, result) {
                if (err)
                    res.json({
                        error: 0,
                        data: err
                    });
                else
                    res.json({
                        error: 0,
                        data: result
                    });
            });
        }
    });

});

function pushItemToUserFeed(item_id, user_id, req) {
    var redis = req.redis;
    redis.lpush('user_feed_' + user_id, item_id, function (err) {
        redis.incr('user_feed_unread_' + user_id);
        redis.ltrim(['user_feed_' + user_id, 0, 100], function (err, res) {
        });
    });
}


// doesnt make sense because we are always sending notification to user directly
// 
//router.all('/subscribe', function (req, res, next) {
//    var body = req.body;
//    var user_id = body.user_id;
//    var channel = body.channel;
//
//    var User = req.User;
//    if (user_id && channel) {
//        User.update({
//            user_id: user_id
//        }, {
//            $push: {
//                channel: channel
//            }
//        }, function (err) {
//            if (err) {
//                next(err);
//            } else {
//                res.json({error: 0});
//            }
//        });
//    } else {
//        res.json({
//            error: 1,
//            message: 'Invalid Request'
//        });
//    }
//});
//router.all('/unsubscribe', function (req, res, next) {
//    var body = req.body;
//    var user_id = body.user_id;
//    var channel = body.channel;
//
//    var User = req.User;
//    if (user_id && channel) {
//        User.update({
//            user_id: user_id
//        }, {
//            $pull: {
//                channel: channel
//            }
//        }, function (err) {
//            if (err) {
//                next(err);
//            } else {
//                res.json({error: 0});
//            }
//        });
//    } else {
//        res.json({
//            error: 1,
//            message: 'Invalid Request'
//        });
//    }
//});



module.exports = router;
