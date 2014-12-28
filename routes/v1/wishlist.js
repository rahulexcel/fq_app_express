var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var moment = require('moment-timezone');

router.all('/list', function (req, res) {
    var body = req.body;
    var user_id = body.user_id;
    var Wishlist = req.Wishlist;
    var User = req.User;
    var website_scrap_data = req.conn_website_scrap_data;

    if (user_id && product_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }, function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {
                    Wishlist.find({
                        user_id: user_id,
                        expired: 0
                    }).sort({created_at: -1}).exec(function (err, data) {
                        if (err) {
                            next(err);
                        } else {
                            var ret = [];
                            var k = 0;
                            for (var i = 0; i < data.length; i++) {

                                var product_id = data[i].get('product_id');

                                var prod = {};
                                website_scrap_data.findOne({
                                    _id: mongoose.Types.ObjectId(product_id)
                                }, function (err, row) {
                                    if (row) {
                                        var name = row.get('name');
                                        var brand = row.get('brand');
                                        var img = row.get('img');
                                        var href = row.get('href');
                                        var price = row.get('price');
                                        var website = row.get('website');
                                    } else {
                                        var name = data[i].get('name');
                                        var brand = data[i].get('brand');
                                        var img = data[i].get('img');
                                        var href = data[i].get('url');
                                        var price = data[i].get('price');
                                        var website = data[i].get('website');
                                    }
                                    var created_at = data[i].get('created_at');
                                    prod.name = name;
                                    prod.brand = brand;
                                    prod.img = img;
                                    prod.href = href;
                                    prod.price = price;
                                    prod.website = website;

                                    prod.created_at = moment(created_at).tz('Asia/Calcutta').format('Do MMM h:mm a');

                                    ret.push(prod);
                                    if (k == (data.length - 1)) {
                                        res.json(ret);
                                    }
                                    k++;
                                })
                            }
                        }
                    })
                } else {
                    res.json({
                        error: 1,
                        message: 'User Not Found'
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
})

router.all('/add', function (req, res) {
    var body = req.body;
    var product_id = body.product_id;
    var user_id = body.user_id;

    var website_scrap_data = req.conn_website_scrap_data;
    var Wishlist = req.Wishlist;
    var User = req.User;

    if (user_id && product_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }, function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {
                    Wishlist.find({
                        user_id: user_id,
                        expired: 0
                    }, function (err, data) {
                        if (err) {
                            next(err);
                        } else {
                            if (data.length > 50) {
                                res.json({
                                    error: 1,
                                    message: 'Can Have Maximum of 50 Items in your wishlist'
                                });
                            } else {

                                var found = false;
                                for (var i = 0; i < data.length; i++) {
                                    if (data[i].get('product_id') == product_id) {
                                        found = true;
                                        break;
                                    }
                                }

                                website_scrap_data.findOne({
                                    _id: mongoose.Types.ObjectId(product_id)
                                }, function (err, product_row) {
                                    if (err) {
                                        next(err);
                                    } else {

                                        if (found) {
                                            res.json({
                                                error: 1,
                                                message: 'Product Already In Your Wishlist'
                                            });
                                        } else {

                                            var time_stamp = moment().valueOf();

                                            var wish_model = new Wishlist({
                                                user_id: user_id,
                                                product_id: product_id,
                                                name: product_row.get('name'),
                                                url: product_row.get('href'),
                                                img: product_row.get('img'),
                                                website: product_row.get('website'),
                                                brand: product_row.get('brand'),
                                                price: product_row.get('price'),
                                                base_price: product_row.get('price'),
                                                expired: 0,
                                                unique: product_row.get('unique'),
                                                created_at: time_stamp
                                            });
                                            wish_model.save(function (err) {
                                                if (err) {
                                                    next(err);
                                                } else {
                                                    res.json({
                                                        error: 0
                                                    });
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    })
                } else {
                    res.json({
                        error: 1,
                        message: 'User Not Found'
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

module.exports = router;
