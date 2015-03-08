var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');


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

    GCM.find({
        user_id: user_id
    }, function (err, rows) {
        if (err) {
            next(err);
        } else {
            for (var i = 0; i < rows.length; i++) {
                registrationIds.push(rows[i].reg_id);
            }
            console.log(registrationIds);
            var sender = new gcm.Sender('AIzaSyABDceQztvkstpKksCz86-hQAFeshqoBV4');

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
