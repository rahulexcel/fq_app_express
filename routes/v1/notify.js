var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var apn = require('apn');
//subscribe to price alerts

console.log('connecting to apn');
var apn_service = new apn.connection({production: false,"passphrase":'java@123'});

apn_service.on("connected", function () {
    console.log("Connected");
});

apn_service.on("transmitted", function (notification, device) {
    console.log("Notification transmitted to:" + device.token.toString("hex"));
});

apn_service.on("transmissionError", function (errCode, notification, device) {
    console.error("Notification caused error: " + errCode + " for device ", device, notification);
    if (errCode === 8) {
        console.log("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
    }
});

apn_service.on("timeout", function () {
    console.log("Connection Timeout");
});

apn_service.on("disconnected", function () {
    console.log("Disconnected from APNS");
});

apn_service.on("socketError", console.error);


router.all('/item/price_alert', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var product_id = body.product_id;
    var user_watch_map = req.user_watch_map;
    var website_scrap_data = req.conn_website_scrap_data;
    if (user_id && product_id) {
        website_scrap_data.findOne({
            _id: mongoose.Types.ObjectId(product_id)
        }, function (err, product_row) {
            if (err) {
                next();
            } else {
                if (!product_row) {
                    res.json({
                        error: 1,
                        message: 'Product Not Found'
                    });
                } else {

                    var product_id = product_row.get('_id');
                    var unique = product_row.get('unique');
                    var website = product_row.get('website');
                    var name = product_row.get('name');
                    var href = product_row.get('href');
                    var price = product_row.get('price');
                    var cat_id = product_row.get('cat_id');
                    var sub_cat_id = product_row.get('sub_cat_id');
                    var img = product_row.get('img');

                    if(price < 0){
                        res.json({
                            error: 0,
                            data: 0
                        });
                    }

                    user_watch_map.findOne({
                        for_fashion_iq: true,
                        unique: unique,
                        website: website,
                    }, function (err, row) {
                        if (err) {
                            next(err);
                        } else {
                            if (row && row.get('_id')) {

                                user_watch_map.update({
                                    _id: row._id
                                }, {
                                    $push: {
                                        user_id: user_id
                                    }
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
                                if (body.price && body.price != -1) {
                                    price = body.price;
                                }
                                var watch_model = new user_watch_map({
                                    for_fashion_iq: true,
                                    fq_product_id: product_id,
                                    unique: unique,
                                    user_id: [user_id],
                                    website: website,
                                    url: href,
                                    img: img,
                                    query_id: false,
                                    base_price: price * 1,
                                    price: price * 1,
                                    start_time: new Date().getTime(),
                                    start_time_pretty: new Date(),
                                    is_first: 1,
                                    done: 0,
                                    tries: 0,
                                    done_time: new Date().getTime(),
                                    name: name,
                                    cat_id: cat_id * 1,
                                    sub_cat_id: sub_cat_id * 1,
                                    is_query_exist: false
                                });
                                watch_model.save(function (err) {
                                    if (err) {
                                        next(err);
                                    } else {
                                        res.json({
                                            error: 0,
                                            data: 1
                                        });
                                    }
                                });
                            }

                        }
                    });
                }
            }
        });
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});
//stop price alerts for a user
router.all('/stop_alert', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var alert_id = body.alert_id;
    var user_watch_map = req.user_watch_map;
    user_watch_map.find({
        _id: mongoose.Types.Object(alert_id)
    }).lean().exec(function (err, row) {
        if (err) {
            next(err);
        } else {

            var user_ids = row.user_id;
            var new_user_ids = [];
            for (var i = 0; i < user_ids.length; i++) {
                if (user_ids[i] + "" !== user_id + "") {
                    new_user_ids.push(user_ids[i]);
                }
            }

            user_watch_map.update({
                _id: mongoose.Types.Object(alert_id)
            }, {
                $set: {
                    user_id: new_user_ids
                }
            }, function (err) {
                if (err) {
                    next(err);
                } else {
                    res.json({
                        error: 0,
                        data: []
                    });
                }
            });
        }
    });
});
//change price in price alert
router.all('/modify_alerts', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var item_id = body.item_id;
    var price = body.price;
    var user_watch_map = req.user_watch_map;
    if (user_id && item_id && price) {

        user_watch_map.find({
            _id: mongoose.Types.ObjectId(item_id)
        }).lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {

                    var user_setting = row.user_setting;
                    if (!user_setting) {
                        user_setting = [];
                    }

                    var new_user_setting = [];
                    for (var i = 0; i < user_setting.length; i++) {
                        if (user_setting[i].user_id + "" !== user_id + "") {
                            new_user_setting.push(user_setting[i]);
                        }
                    }
                    if (price != "remove") {
                        new_user_setting.push({
                            user_id: user_id,
                            price: price * 1
                        });
                    }
                    user_watch_map.update({
                        _id: mongoose.Types.ObjectId(item_id)
                    }, {
                        $set: {
                            user_setting: new_user_setting
                        }
                    }, function (err) {
                        if (err) {
                            next(err);
                        } else {
                            res.json({
                                error: 0,
                                data: []
                            });
                        }
                    });
                } else {
                    res.json({
                        error: 1,
                        message: 'Price Alert Not Found'
                    });
                }
            }
        });
    } else {
        res.json({
            error: 0,
            message: 'Invalid Request'
        });
    }

});

//get single alert by id

router.all('/get_alert', function (req, res, next) {
    var body = req.body;
    var alert_id = body.alert_id;
    var user_watch_map = req.user_watch_map;

    if (alert_id) {
        user_watch_map.findOne({
            _id: mongoose.Types.ObjectId(alert_id)
        }).lean().exec(function (err, data) {
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

//get all alerts page wise
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
        }).sort({start_time_pretty: -1}).skip(page * 10).limit(10).lean().exec(function (err, data) {
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
    var device = body.device;
    var model = '';
    if (device.model) {
        model = device.model;
    }

    var GCM = req.GCM;
    if (user_id && device) {
        GCM.findOne({
            user_id: user_id,
            'device.model': model
        }, function (err, gcm_row) {
            if (err) {
                next(err);
            } else if (gcm_row && gcm_row._id) {
                if (body.reg_id) {
                    var reg_id = body.reg_id;
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
                    });
                } else {
                    var token = body.token;
                    GCM.update({
                        _id: gcm_row._id
                    }, {
                        $set: {
                            token: token,
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
                    });
                }
            } else {
                if (body.reg_id) {
                    var reg_id = body.reg_id;
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
                } else {
                    var token = body.token;
                    var new_gcm = new GCM({
                        user_id: user_id,
                        token: token,
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

    if (typeof user_id === 'string') {
        if (data.meta && data.meta.type && data.meta.type == 'item_add') {
            pushItemToUserFeed(data.meta.item_id, user_id, req);
        }
    } else {
        if (data.meta && data.meta.type && data.meta.type == 'item_add') {
            for (var i = 0; i < user_id.length; i++) {
                pushItemToUserFeed(data.meta.item_id, user_id[i], req);
            }
        }
    }


    var logs = [];
    GCM.find(where, function (err, rows) {
        if (err) {
            next(err);
        } else {


            for (var i = 0; i < rows.length; i++) {
                if (rows[i].reg_id){
                    registrationIds.push(rows[i].reg_id);
                    logs.push('reg ids ' + rows[i].reg_id);
                }
            }
            console.log(registrationIds);

            var sender = new gcm.Sender('AIzaSyABDceQztvkstpKksCz86-hQAFeshqoBV4');
            console.log(data.meta);
            if (registrationIds) {
                sender.send(message, registrationIds, 1, function (err, result) {
                    // if (err)
                    //     res.json({
                    //         error: 0,
                    //         data: err
                    //     });
                    // else
                    //     res.json({
                    //         error: 0,
                    //         data: result
                    //     });
                });
            }

            //ios below
            var tokens = [];
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].token) {
                    tokens.push(rows[i].token);
                    logs.push('token ' + rows[i].token);
                }
            }
            var note = new apn.notification();
            note.setAlertText(data.message);
            note.badge = 0;
            data.meta = JSON.stringify(data.meta);
            note.payload = data;
            apn_service.pushNotification(note, tokens);
        }
        res.json({
            error: 0,
            data: logs
        });
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
