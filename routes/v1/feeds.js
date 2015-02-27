var express = require('express');
var router = express.Router();
var moment = require('moment-timezone');
var mongoose = require('mongoose');


//http://stackoverflow.com/questions/11653545/hot-content-algorithm-score-with-time-decay
//https://coderwall.com/p/cacyhw/an-introduction-to-ranking-algorithms-seen-on-social-news-aggregators

function checkTrendingFeedData(req, done, next) {
    console.log('generating new data for trending feed');
    var redis = req.redis;
    var WishlistItem = req.WishlistItem;

    var oper = {};
    oper.verbose = true;
    oper.map = function () {
        var the_day_of_reckoning = '2015-01-22T12:14:23.790Z';
        var pins = this.pins ? this.pins.length : 0;
        var likes = this.meta ? this.meta.likes : 0;
        var user_points = this.meta ? this.meta.user_points ? this.meta.user_points : 0 : 0;
        var list_points = this.list_points || 0;
        var updated_at = this.updated_at;
        var created_at = this.created_at;
        if (!updated_at) {
            updated_at = new Date(this.the_day_of_reckoning);
        }
        if (!created_at) {
            created_at = new Date(this.the_day_of_reckoning);
        }
        var dimension = {};
        if (this.dimension) {
            dimension = this.dimension;
        }


        var s = 2 * pins + 8 * likes + user_points + list_points;
        var baseScore = Math.log(Math.max(s, 1));
        var now = new Date().getTime();

        var timeDiff = (now - created_at.getTime()) / (1000 * 60 * 60 * 24 * 7);
        //time different in weeks
        //if you have more and more posts we can reduce time difference to days, hours as well

        if (timeDiff > 1) {
            //if more than 1week
            var x = timeDiff - 1;
            baseScore = baseScore * Math.exp(-8 * x * x)
        }

        var base_time = new Date(the_day_of_reckoning).getTime();
        var seconds = created_at.getTime() - base_time;
        baseScore = Math.round(baseScore + 1 * seconds / 45000, 7);

        emit(this._id, {
            image: this.img,
            original: this.original,
            name: this.name,
            description: this.description,
            website: this.website,
            dimension: dimension,
            pins: pins,
            likes: likes,
            user_points: user_points,
            list_points: list_points,
            updated_at: updated_at.getTime(),
            created_at: created_at.getTime(),
            baseScore: baseScore * 1
        });
    }
    oper.reduce = function (key, values) {
        return 1;
    };
    //update mapreduce using cron job rather on request
    WishlistItem.mapReduce(oper, function (err, result) {
        if (err) {
            next(err);
        } else {

            console.log('trending data length ' + result.length);

            for (var i = 0; i < result.length; i++) {

                if (result.length !== 0) {
                    var new_result = [];
                    for (var i = 0; i < result.length; i++) {
                        var row = result[i];
                        if (row.value.original && row.value.original.user_id) {
                            if (row.value.image.length > 0) {
                                row.value._id = row._id;
                                new_result.push(row.value);
//                                console.log(row.value.baseScore);
                            }
                        }
                    }
                }
                redis.del('home_trending', function (err) {
                    if (err) {
                        console.log('201');
                        console.log(err);
                    }
                    if (new_result.length > 0) {
                        var k = 0;
                        for (var i = 0; i < new_result.length; i++) {
                            (function (row, i) {
                                var user_id = row.original.user_id;
                                req.user_helper.getUserDetail(user_id, req, function (err, user_detail) {
                                    if (!err) {
                                        row.user = {
                                            name: user_detail.name,
                                            picture: user_detail.picture
                                        };
                                        new_result[i] = row;
                                    }

                                    var Wishlist = req.Wishlist;
                                    Wishlist.findOne({
                                        _id: mongoose.Types.ObjectId(row.original.list_id)
                                    }).lean().exec(function (err, list_row) {
                                        var is_private = false;
                                        if (!err) {
                                            row.list = {
                                                name: list_row.name
                                            };
                                            if (list_row.type == 'private') {
                                                is_private = true;
                                            }
                                            row.original = JSON.stringify(row.original);
                                            row.dimension = JSON.stringify(row.dimension);
                                            row.user = JSON.stringify(row.user);
                                            row.list = JSON.stringify(row.list);
                                            new_result[i] = row;
                                        }
                                        if (!is_private) {
                                            redis.hmset('item_' + row._id, row, function (err) {
                                                if (err) {
                                                    console.log('227');
                                                    console.log(err);
                                                }
                                                redis.expire('item_' + row._id, 60 * 60 * 24 * 7, function () {
                                                    if (err) {
                                                        console.log('246');
                                                        console.log(err);
                                                    }
                                                    redis.zadd('home_trending', row.baseScore, row._id, function (err) {
                                                        if (err) {
                                                            console.log('236');
                                                            console.log(err);
                                                        }
                                                        if (k === (new_result.length - 1)) {
                                                            done();
                                                            //one minute right now.
                                                            redis.expire('home_trending', 60);
                                                            redis.lpush('home_trending_block', '1');
                                                        }
                                                        k++;
                                                    });
                                                });
                                            });
                                        } else {
                                            if (k === (new_result.length - 1)) {
                                                done();
                                                //one minute right now.
                                                redis.expire('home_trending', 60);
                                                redis.lpush('home_trending_block', '1');
                                            }
                                            k++;
                                        }
                                    });

                                });
                            })(new_result[i], i);
                        }

                    } else {
                        done();
                    }
                });

            }

        }
    });
}

function getTrendingData(page, req, next, done, recursion) {
    var redis = req.redis;
    redis.zrevrangebyscore(['home_trending', '+inf', '-inf', 'WITHSCORES', 'LIMIT', page * 10, 10], function (err, response) {
        if (err) {
            console.log('307');
            console.log(err);
            next(err);
        } else {

            if (response.length === 0) {
                if (page === 0) {
                    if (recursion) {
                        //check if blocking key exists
                        redis.exists('home_trending_block', function (err, res) {
                            console.log('key exists');
                            console.log(res);
                            if (res === 1) {
                                //delete it and block till you get new data
                                redis.del('home_trending_block', function () {
                                    checkTrendingFeedData(req, function () {
                                        getTrendingData(page, req, next, function (data1) {
                                            done(data1);
                                        }, false);
                                    }, next);

                                });
                            } else {
                                //wait for data
                                redis.blpop(['home_trending_block', 10], function (err) {
                                    getTrendingData(page, req, next, function (data1) {
                                        if (data1.length === 0) {
                                            //safe mesaure incase trending feed gets stuck
                                            checkTrendingFeedData(req, function () {
                                            });
                                        }

                                        done(data1);
                                    }, false);
                                });
                            }
                        })
                    } else {
                        done([]);
                    }

                } else {
                    done([]);
                }
            } else {

                console.log('309');
                console.log(response);

                var new_array = {};
                var total = 0;
                for (var i = 0; i < response.length; i++) {
                    if (i % 2 === 0 && response[i + 1]) {
                        new_array[response[i]] = response[i + 1];
                        total++;
                    }
                }

                var k = 0;
                var ret = [];
                for (var key in new_array) {
                    var value = new_array[key];
                    redis.hgetall('item_' + key, function (err, obj) {
                        obj.score = value;
                        obj.original = JSON.parse(obj.original);
                        obj.dimension = JSON.parse(obj.dimension);
                        obj.user = JSON.parse(obj.user);
                        obj.list = JSON.parse(obj.list);
                        if (!obj.description || obj.description == 'null') {
                            obj.description = '';
                        }
                        if (!obj.name || obj.name == 'null') {
                            obj.name = '';
                        }
                        ret.push(obj);
                        if (k === (total - 1)) {
//                            res.json({
//                                error: 0,
//                                data: ret
//                            });
                            done(ret);
                        }
                        k++;
                    });
                }
            }
        }
    });
}

router.all('/trending', function (req, res, next) {

    var page = req.body.page;
    if (!page) {
        page = 0;
    }
    console.log('page' + page);
    getTrendingData(page, req, next, function (data) {
        res.json({
            error: 0,
            data: data
        });
    }, true);
});



//--start----latest feed-------------------
function updateLatestFeedData(req, done, next) {
    console.log("!! start :: updateLatestFeedData !!! ");
    var redis = req.redis;
    var website_scrap_data = req.conn_website_scrap_data;
    var product_data_list = req.config.product_data_list;
    product_data_list = product_data_list.replace('price_history', '');
    //-------------------------------------------------
    var latest_types = new Array;
    latest_types.push({
        'type': 'men',
        'where': {
            '$or': [
                {'cat_id': {'$in': [30, 40, 42, 44, 61]}},
                {'sub_cat_id': {'$in': [6201, 6301]}}
            ]
        },
        'redis_key': 'home_latest_men',
    });
    latest_types.push({
        'type': 'women',
        'where': {
            '$or': [
                {'cat_id': {'$in': [50, 51, 52, 54]}},
                {'sub_cat_id': {'$in': [6202, 6302]}}
            ]
        },
        'redis_key': 'home_latest_women',
    });

    var latest_where = {};
    var latest_sort = {
        'sort_score': 1
    };
    var total_process = 0;
    var start = new Date().getTime();
    latest_types.forEach(function (val, key) {
        (function (kk, val) {
            var lt_type = val.type;
            var lt_where = val.where;
            var lt_redis_key = val.redis_key;
            console.log(lt_where);
            website_scrap_data.where(lt_where).sort(latest_sort).limit(300).select(product_data_list).lean().find(latest_results);
            function latest_results(err, latest_products) {
                if (err) {
                    console.log(err);
                    console.log('line 342');
                } else {
                    redis.del(lt_redis_key, function (err) {
                        if (err) {
                            console.log('line 301')
                        }
                        if (latest_products.length > 0) {
                            for (var i = 0; i < latest_products.length; i++) {
                                var row = latest_products[i];
                                (function (kk, i, row) {
                                    var row_mongo_id = row._id;
                                    redis.hmset('item_' + row_mongo_id, row, function (err) {
                                        if (err) {
                                            console.log('305');
                                            console.log(err);
                                        }

                                        redis.expire('item_' + row_mongo_id, 60 * 60 * 24 * 7, function () {
                                            if (err) {
                                                console.log('310');
                                                console.log(err);
                                            }
                                            redis.zadd(lt_redis_key, i, row_mongo_id, function (err) {
                                                if (err) {
                                                    console.log('315');
                                                    console.log(err);
                                                }
                                                if (i == (latest_products.length - 1)) {
                                                    console.log(lt_redis_key + ' :: update ho gya hai !!!');
                                                    total_process++;
                                                }

                                                if (total_process == latest_types.length) {
                                                    console.log(" !!! final update ho gya hai!!!");
                                                    var end = new Date().getTime() - start;
                                                    console.log('time taken ' + end);
                                                    done();
                                                    redis.set('home_latest_generate', new Date() + "");
                                                    redis.expire('home_latest_generate', 60 * 60 * 1);
                                                }
                                            });
                                        });
                                    });
                                })(kk, i, row);
                            }
                        }
                    });
                }
            }
        })(key, val);
    });
}
function getLatestData(latest_type, page, req, next, done, recursion) {
    var redis = req.redis;
    var productObj = req.productObj;
    //redis.flushall();
    //console.log('flush hua hau');
    //process.exit(0);
    var latest_data = [];
//    redis.exists('home_latest', function (err, res) {
//        if (res === 0) {
//            if (!recursion) {
//                updateLatestFeedData(req, function () {
//                    console.log('update latest feed data done');
//                    redis.exists('home_latest_block', function (err, res) {
//                        if (res === 1) {
//                            redis.lpush('home_latest_block', 1, function () {
//                                redis.del('home_latest_block');
//                            });
//                        }
//                    });
//                }, next);
//                redis.blpop(['home_latest_block', 20], function () {
//                    console.log('calling latest data again');
//                    getLatestData(page, req, next, done, true);
//                });
//            } else {
//                console.log('empty data even after recursion');
//                done([]);
//            }
//        }
//        else {
    redis.zrevrangebyscore([latest_type, '+inf', '-inf', 'WITHSCORES', 'LIMIT', page * 20, 20], function (err, response) {
        if (err) {
            console.log('307');
            console.log(err);
            next(err);
        } else {
            if (response.length == 0) {
                console.log('----empty data should not be here');
                done([]);//returs empty data not found;
            } else {
                console.log('call hua hai');
                var new_array = [];
                var total = 0;
                for (var i = 0; i < response.length; i++) {
                    if (i % 2 === 0) {
                        new_array.push(response[i]);
                        total++;
                    }
                }

                for (var k = 0; k < total; k++) {
                    var row_key = new_array[k];
                    (function (kk, row_key, total) {
                        redis.hgetall('item_' + row_key, function (err, obj) {
                            if (err) {
                                console.log('line 355');
                                console.log(err);
                            } else {
                                if (obj) {
                                    var original = obj;
                                    latest_data.push(productObj.getProductPermit(req, original));
                                }
                            }
                            if (kk === total - 1) {
                                done(latest_data);
                            }
                        });
                    })(k, row_key, total);

                }
            }
        }
    });
//        }
//    });
}
router.all('/latest', function (req, res, next) {
    var latest_type = req.param('father');
    var page = req.body.page;
    if (!page) {
        page = 0;
    }
    console.log('page' + page);
    getLatestData(latest_type, page, req, next, function (data) {
        res.json({
            error: 0,
            data: data
        });
    });
});


//--end------latest feed-------------------



router.all('/my', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var page = req.body.page;
    if (!page) {
        page = 0;
    }
    console.log('page' + page);

    var redis = req.redis;
    redis.lrange(['user_feed_' + user_id, page * 10, 10], function (err, response) {
        if (err) {
            next(err);
        } else {
            var ret = [];
            for (var i = 0; i < response.length; i++) {
                var obj = response[i];
                obj.original = JSON.parse(obj.original);
                obj.dimension = JSON.parse(obj.dimension);
                obj.user = JSON.parse(obj.user);
                obj.list = JSON.parse(obj.list);
                ret.push(obj);
            }
            res.json({
                error: 0,
                data: ret
            });
        }
    });
});

router.all('/user/top', function (req, res, next) {
    var body = req.body;
    var skip = body.skip;
    if (!skip) {
        skip = 0;
    }
    var user_id = -1;
    if (body.user_id) {
        user_id = body.user_id;
    }
    var where = {
        'meta.products': {$gt: 0},
    };
    if (user_id !== -1) {
        where['_id'] = {$ne: user_id};
        where['friends'] = {$elemMatch: {$ne: user_id}};
        where['followers'] = {$elemMatch: {$ne: user_id}};
    }
    var User = req.User;
    User.find(where).sort({'meta.score': -1}).limit(10).skip(skip * 10).lean().exec(function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json({
                error: 0,
                data: result
            });
        }
    });

});
router.all('/list/top', function (req, res, next) {
    var body = req.body;
    var skip = body.skip;
    if (!skip) {
        skip = 0;
    }
    var user_id = -1;
    if (body.user_id) {
        user_id = body.user_id;
    }
    var Wishlist = req.Wishlist;
    var where = {
        'meta.products': {$gt: 0},
        type: 'public'
    };
    if (user_id !== -1) {
        where['user_id'] = {$ne: user_id};
        where['followers'] = {$elemMatch: {$ne: user_id}};
    }
    Wishlist.find(where).sort({'meta.score': -1}).limit(10).skip(skip * 10).lean().exec(function (err, result) {
        if (err) {
            next(err);
        } else {
            res.json({
                error: 0,
                data: result
            });
        }
    });
});

function calculateTop(type, req, limit, skip, done) {
    if (type === 'top_users') {
        calculateTopUsers(req, limit, skip, done);
    } else {
        calculateTopLists(req, limit, skip, done);
    }
}
function processCalc(type, req, res, next, done) {

    var limit = 50;

    var moment = require('moment-timezone');
    var Calculation = req.Calculation;
    var current_date = moment().tz("Asia/Kolkata").format('DD-MM-YYYY');
    Calculation.findOne({
        type: type
    }).exec(function (err, row) {
        if (err) {
            next(err);
        } else {
            if (row) {

                var date = row.get('current_date');
                if (date !== current_date) {
                    //no processing done today. so start fresh
                    calculateTop(type, req, limit, 0, function (count) {
                        if (!count) {
                            Calculation.update({
                                type: type
                            }, {
                                $set: {
                                    current_date: current_date,
                                    status: 'done',
                                    skip: limit
                                }
                            }, function (err) {
                                if (err) {
                                    next(err);
                                } else {
                                    done({
                                        errr: 0,
                                        skip: limit
                                    });
                                }
                            });
                        } else {
                            Calculation.update({
                                type: type
                            }, {
                                $set: {
                                    current_date: current_date,
                                    status: 'pending',
                                    skip: limit
                                }
                            }, function (err) {
                                if (err) {
                                    next(err);
                                } else {
                                    done({
                                        errr: 0,
                                        skip: limit
                                    });
                                }
                            });
                        }
                    });
                } else {
                    if (row.get('status') != 'done') {
                        calculateTop(type, req, limit, row.get('skip') * 1, function (count) {
                            if (!count) {
                                Calculation.update({
                                    type: type
                                }, {
                                    $set: {
                                        current_date: current_date,
                                        status: 'done',
                                        skip: limit + row.get('skip') * 1
                                    }
                                }, function (err) {
                                    if (err) {
                                        next(err);
                                    } else {
                                        done({
                                            status: 'done',
                                            skip: limit + row.get('skip') * 1
                                        });
                                    }
                                });
                            } else {
                                Calculation.update({
                                    type: type
                                }, {
                                    $set: {
                                        current_date: current_date,
                                        status: 'pending',
                                        skip: limit + row.get('skip') * 1
                                    }
                                }, function (err) {
                                    if (err) {
                                        next(err);
                                    } else {
                                        done({
                                            status: 'pending',
                                            skip: limit + row.get('skip') * 1
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        done({
                            status: 'done'
                        });
                    }
                }


            } else {
                //no existing data so again freshe rstatus
                calculateTop(type, req, limit, 0, function (count) {
                    if (!count) {
                        var calc = new Calculation({
                            type: type,
                            current_date: current_date,
                            status: 'done',
                            skip: limit
                        });
                        calc.save(function () {
                            done({
                                error: 0,
                                data: calc
                            });
                        });
                    } else {
                        var calc = new Calculation({
                            type: type,
                            current_date: current_date,
                            status: 'pending',
                            skip: limit
                        });
                        calc.save(function () {
                            done({
                                error: 0,
                                data: calc
                            });
                        });
                    }
                });
            }
        }
    });
}

router.all('/stats', function (req, res, next) {
    var moment = require('moment-timezone');
    var current_date = moment().tz("Asia/Kolkata").format('DD-MM-YYYY');
    var current_hour = moment().tz("Asia/Kolkata").format('HH');

    var redis = req.redis;

    redis.exists('home_latest_generate', function (err, res) {
        if (res === 0) {
            updateLatestFeedData(req, function () {
            }, next);
        }
    });

    if (current_hour > 1) {
        //night 1am
        processCalc('top_users', req, res, next, function (res0) {
            processCalc('top_lists', req, res, next, function (res1) {
                res.json({
                    error: 0,
                    data: {
                        top_users: res0,
                        top_lists: res1
                    }
                });
            });
        });
    } else {
        res.json({
            error: 1,
            data: current_date + " " + current_hour
        });
    }
});

function calculateTopLists(req, limit, skip, done) {
    console.log('generating new data for top lists');
    var WishlistItem = req.WishlistItem;
    var Wishlist = req.Wishlist;

    var moment = require('moment-timezone');
    var current_date = moment().tz("Asia/Kolkata").format('DD-MM-YYYY HH:mm');

    if (!skip) {
        skip = 0;
    }
    Wishlist.find({
        'meta.products': {$gt: 0}
    }).sort({created_at: 1}).limit(limit).skip(skip).lean().exec(function (err, result) {
        if (err) {
            console.log(err);
        }
        if (result && result.length) {
            var k = 0;
            for (var i = 0; i < result.length; i++) {
                var list = result[i];
                var list_id = list._id;
                WishlistItem.find({
                    'original.list_id': list_id
                }).lean().exec(function (err, items) {
                    var list_score = 0;
                    if (items && items.length > 0) {
                        for (var i = 0; i < items.length; i++) {
                            var item = items[i];
                            var baseScore = getItemScore(item);
                            list_score = list_score + baseScore;
                        }
                    }
                    Wishlist.update({
                        _id: mongoose.Types.ObjectId(list_id)
                    }, {
                        $set: {
                            'meta.score': list_score,
                            'meta.score_updated': current_date
                        }
                    }, function () {
                        if (k === (result.length - 1)) {
                            done(true);
                        }
                        k++;
                    });
                });
            }
        } else {
            done(false);
        }
    });
}
function calculateTopUsers(req, limit, skip, done) {
    console.log('generating new data for top users');
    var moment = require('moment-timezone');
    var current_date = moment().tz("Asia/Kolkata").format('DD-MM-YYYY HH:mm');
    var User = req.User;
    var WishlistItem = req.WishlistItem;
    console.log('limit ' + limit + " skip " + skip);
    User.find({
        'meta.products': {$gt: 0}
    }).sort({created_at: 1}).limit(limit).skip(skip).lean().exec(function (err, result) {
        if (err) {
            console.log(err);
        }
        if (result && result.length > 0) {
            var k = 0;
            for (var i = 0; i < result.length; i++) {
                var user = result[i];
                var user_id = user._id;
                WishlistItem.find({
                    'original.user_id': user_id
                }).lean().exec(function (err, items) {
                    if (err) {
                        console.log('err 572');
                        console.log(err);
                    }
                    var user_score = 0;
                    if (items && items.length > 0) {
                        for (var i = 0; i < items.length; i++) {
                            var item = items[i];
                            var baseScore = getItemScore(item);
                            user_score = user_score + baseScore;
                        }
                    }
                    console.log("user _id " + user_id + 'score ' + user_score);
                    User.update({
                        _id: mongoose.Types.ObjectId(user_id)
                    }, {
                        $set: {
                            'meta.score': user_score,
                            'meta.score_updated': current_date
                        }
                    }, function (err) {
                        if (err) {
                            console.log(err);
                        }
                        if (k === (result.length - 1)) {
                            done(true);
                        }
                        k++;
                    });
                });
            }
        } else {
            done(false);
        }
    });
}

function getItemScore(item) {
    var the_day_of_reckoning = '2015-01-22T12:14:23.790Z';
    var pins = item.pins ? item.pins.length : 0;
    var likes = item.meta ? item.meta.likes : 0;
    var user_points = item.meta ? item.meta.user_points ? item.meta.user_points : 0 : 0;
    var list_points = item.list_points || 0;
    var created_at = item.created_at;
    if (!created_at) {
        created_at = new Date(the_day_of_reckoning);
    }

    var s = 2 * pins + 8 * likes + user_points + list_points;
    var baseScore = Math.log(Math.max(s, 1));
    var now = new Date().getTime();

    var timeDiff = (now - created_at.getTime()) / (1000 * 60 * 60 * 24 * 7);
    //time different in weeks
    //if you have more and more posts we can reduce time difference to days, hours as well

    if (timeDiff > 1) {
        //if more than 1week
        var x = timeDiff - 1;
        baseScore = baseScore * Math.exp(-8 * x * x)
    }

    var base_time = new Date(the_day_of_reckoning).getTime();
    var seconds = created_at.getTime() - base_time;
    return Math.round(baseScore + 1 * seconds / 45000, 7);
}

module.exports = router;