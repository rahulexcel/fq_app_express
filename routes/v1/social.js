var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var moment = require('moment-timezone');
var akismet = require('akismet-api');
var client = akismet.client({
    key: 'd752512fcd78', // Required!
    blog: 'http://pricegenie.co'        // Required!
});
var use_akismat = false;
client.verifyKey(function (err, valid) {
    if (valid) {
        console.log('Valid key!');
        use_akismat = true;
    } else {
        console.log('Key validation failed...');
        console.log(err.message);
    }
});
var pin_limit = 10;

router.all('/updates', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var summary = body.summary;

    var Updates = req.Updates;
    if (summary) {
        Updates.count({
            user_id: user_id,
            read: false
        }, function (err, result) {
            if (err) {
                next(err);
            } else {
                res.json({
                    error: 0,
                    data: result
                });
            }
        });
    }
});

router.all('/gcm', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var reg_id = body.reg_id;
    var api_key = body.api_key;
    var device = body.device;

    var GCM = req.GCM;

    if (user_id && reg_id && api_key) {
        GCM.findOne({
            user_id: user_id,
            api_key: api_key
        }, function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {
                    GCM.update({
                        _id: row.get('_id')
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
                    var model = new GCM({
                        user_id: user_id,
                        api_key: api_key,
                        reg_id: reg_id,
                        device: device
                    });
                    model.save(function (err) {
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
});


//http://stackoverflow.com/questions/11653545/hot-content-algorithm-score-with-time-decay
//https://coderwall.com/p/cacyhw/an-introduction-to-ranking-algorithms-seen-on-social-news-aggregators

var last_check = false;
function checkFeedData(req, done, next) {

    if (last_check) {
        var now = new Date().getTime();
        //1minute
        if ((now - last_check) > 1000 * 60 * 1) {
            return done();
        }
    }
    last_check = new Date().getTime();

    var WishlistItem = req.WishlistItem;

    var oper = {};
//    oper.limit = 30;
    //set query and out as well

//    oper.out = {replace: 'feed'};
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

//        var final_values = {};
//        var latest = 0;
//        for (var i = 0; i < values.length; i++) {
//            if (values[i].updated_at > latest) {
//                final_values = values[i];
//            }
//        }


        return 1;
    };
    //update mapreduce using cron job rather on request
    WishlistItem.mapReduce(oper, function (err, result) {
        if (err) {
            next(err);
        } else {
            var feed = req.feed;

            feed.collection.drop(function (err, result1) {
                console.log(err);


                //mostly transfer this part to redis
                //right now doing on mongo itself

                for (var i = 0; i < result.length; i++) {

                    if (result.length !== 0) {
                        var new_result = [];
                        for (var i = 0; i < result.length; i++) {
                            var row = result[i];
                            if (row.value.original && row.value.original.user_id) {
                                if (row.value.image.length > 0) {
                                    row.value._id = row._id;
                                    new_result.push(row.value);
                                    console.log(row.value.baseScore);
                                }
                            }
                        }
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
                                        if (!err) {
                                            row.list = {
                                                name: list_row.name
                                            };
                                            new_result[i] = row;
                                        }


                                        feed.findOne({
                                            map_id: row._id
                                        }, function (err, feed_row) {
                                            if (!err) {
                                                if (feed_row && feed_row.get('_id')) {
                                                    feed.update({
                                                        _id: feed_row.get('_id')
                                                    }, {
                                                        $set: row
                                                    }, function (err) {
                                                        if (k === (new_result.length - 1)) {
                                                            done();
                                                        }
                                                        k++;
                                                    });
                                                } else {
                                                    var feed_model = new feed(row);
                                                    feed_model.save(function (err) {
                                                        if (k === (new_result.length - 1)) {
                                                            done();
                                                        }
                                                        k++;
                                                    });
                                                }
                                            }
                                        });

                                    });

                                });
                            })(new_result[i], i);
                        }

                    }

                }
            });

        }
    });
}

router.all('/home', function (req, res, next) {

    checkFeedData(req, function () {
        var feed = req.feed;
        var page = req.body.page;
        if (!page) {
            page = 0;
        }
        console.log(page);
        feed.find().sort({baseScore: -1}).skip(page * 5).limit(5).lean().exec(function (err, result) {
            if (err) {
                next(err);
            } else {
                res.json({
                    error: 0,
                    data: result
                });
            }
        });
    }, next);

});

router.all('/user/unfriend', function (req, res, next) {
    var body = req.body;
    var me_id = body.from_user_id;
    var friend_id = body.friend_id;

    var User = req.User;
    if (me_id && friend_id) {

        User.find({
            _id: mongoose.Types.ObjectId(me_id)
        }, function (err, user_row) {
            if (err) {
                next(err);
            } else {
                var friends = user_row.get('friends');
                if (!friends) {
                    friends = [];
                }
                var new_friends = [];
                for (var i = 0; i < friends.length; i++) {
                    if (friends[i] !== friend_id) {
                        new_friends.push(friends[i]);
                    }
                }


                User.update({
                    _id: mongoose.Types.ObjectId(me_id)
                }, {
                    $set: {
                        friends: new_friends
                    }
                }, function (err) {
                    if (err) {
                        next();
                    } else {

                        //second user
                        User.find({
                            _id: mongoose.Types.ObjectId(friend_id)
                        }, function (err, user_row) {
                            if (err) {
                                next(err);
                            } else {
                                var friends = user_row.get('friends');
                                if (!friends) {
                                    friends = [];
                                }

                                var new_friends = [];
                                for (var i = 0; i < friends.length; i++) {
                                    if (friends[i] !== friend_id) {
                                        new_friends.push(friends[i]);
                                    }
                                }

                                User.update({
                                    _id: mongoose.Types.ObjectId(friend_id)
                                }, {
                                    $set: {
                                        friends: new_friends
                                    }
                                }, function (err) {
                                    if (err) {
                                        next();
                                    } else {

                                        res.json({
                                            error: 0
                                        });
                                    }
                                });
                            }
                        });





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
router.all('/user/acceptfriend', function (req, res, next) {
    var body = req.body;
    var me_id = body.from_user_id;
    var req_id = body.to_user_id;
    var FriendRequest = req.FriendRequest;
    var User = req.User;

    if (me_id && req_id) {
        FriendRequest.findOne({
            _id: mongoose.Types.ObjectId(req_id)
        }, function (err, friend_row) {
            if (err) {
                next(err);
            } else {
                if (friend_row.get('to_user_id') === me_id) {
                    var from_user_id = friend_row.get('from_user_id');
                    var to_user_id = friend_row.get('to_user_id');

                    User.update({
                        _id: mongoose.Types.ObjectId(from_user_id)
                    }, {
                        $push: {
                            friends: to_user_id
                        }
                    }, function (err) {
                        if (err) {
                            next();
                        } else {

                            //second user
                            User.update({
                                _id: mongoose.Types.ObjectId(to_user_id)
                            }, {
                                $push: {
                                    friends: from_user_id
                                }
                            }, function (err) {
                                if (err) {
                                    next();
                                } else {

                                    //second user
                                    FriendRequest.remove({
                                        _id: mongoose.Types.ObjectId(req_id)
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
                            });


                        }
                    });

                } else {
                    res.json({
                        error: 1,
                        message: 'You Cannot Accept This Request.'
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
router.all('/user/declinefriend', function (req, res, next) {
    var body = req.body;
    var me_id = body.from_user_id;
    var req_id = body.to_user_id;
    var FriendRequest = req.FriendRequest;

    if (me_id && req_id) {
        FriendRequest.findOne({
            _id: mongoose.Types.ObjectId(me_id)
        }, function (err, friend_row) {
            if (err) {
                next(err);
            } else {
                if (friend_row.get('to_user_id') === me_id) {
                    FriendRequest.update({
                        _id: mongoose.Types.ObjectId(me_id)
                    }, {
                        $set: {
                            status: 'declined',
                            updated_at: new Date()
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
                    res.json({
                        error: 1,
                        message: 'You Cannot Decline This Request.'
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
router.all('/user/addfriend', function (req, res, next) {
    var body = req.body;
    var from_user_id = body.from_user_id;
    var to_user_id = body.to_user_id;
    var FriendRequest = req.FriendRequest;
    var User = req.User;

    if (from_user_id && to_user_id) {

        User.findOne({
            _id: mongoose.Types.ObjectId(from_user_id)
        }, function (err, user_row) {
            if (err) {
                next(err);
            } else {
                var friends = user_row.get('friends');
                var found = false;
                if (friends && friends.length > 0) {
                    for (var i = 0; i < friends.length; i++) {
                        if (friends[i] === to_user_id) {
                            found = true;
                        }
                    }
                }

                if (found) {
                    res.json({
                        error: 1,
                        message: 'Already Your Friend'
                    });
                } else {
                    FriendRequest.findOne({
                        from_user_id: from_user_id,
                        to_user_id: to_user_id
                    }, function (err, row) {
                        if (err) {
                            next(err);
                        } else {
                            if (row && row._id) {
                                if (row.get('status') === 'pending') {
                                    res.json({
                                        error: 0,
                                        data: {
                                            status: 'pending',
                                            date: row.get('created_at')
                                        }
                                    });
                                } else if (row.get('status') === 'decline') {
                                    res.json({
                                        error: 0,
                                        data: {
                                            status: 'declined'
                                        }
                                    });
                                }
                            } else {
                                var request = new FriendRequest({
                                    from_user_id: from_user_id,
                                    to_user_id: to_user_id,
                                    status: 'pending'
                                });
                                request.save(function (err) {
                                    if (err) {
                                        next();
                                    } else {
                                        res.json({
                                            error: 0,
                                            data: {
                                                status: 'sent'
                                            }
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

router.all('/user/profile/pins', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var skip = body.skip;
    if (!skip) {
        skip = 0;
    }
    var User = req.User;
    var Wishlist = req.Wishlist;
    var WishlistItemAssoc = req.WishlistItemAssoc;

    if (user_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }).lean().exec(function (err, user_row) {
            if (err) {
                next();
            } else if (user_row) {
                var list_ids = [];
                Wishlist.find({
                    user_id: user_id
                }).lean().exec(function (err, rows) {
                    if (err) {
                        next(err);
                    } else {
                        for (var i = 0; i < rows.length; i++) {
                            list_ids.push(rows[i]._id);
                        }

                        WishlistItemAssoc.find({
                            list_id: {
                                $in: list_ids
                            }
                        }).populate({
                            path: 'item_id',
                            options: {
                                sort: {created_at: -1}
                            }
                        }).limit(pin_limit).skip(skip * 1 * pin_limit).lean().exec(function (err, items) {
                            if (err) {
                                next(err);
                            } else {
                                if (!items)
                                    items = [];
                                else {
                                    var new_items = [];
                                    console.log(items);
                                    for (var i = 0; i < items.length; i++) {
                                        var item = items[i].item_id;
                                        if (!item) {
                                            continue;
                                        }
                                        var list_id = items[i].list_id;

                                        var list_name = '';
                                        for (var j = 0; j < rows.length; j++) {
                                            if (rows[j]._id == list_id) {
                                                list_name = rows[j].name;
                                                break;
                                            }
                                        }

                                        item.image = item.img;
                                        item.user = {
                                            name: user_row.name,
                                            picture: user_row.picture
                                        };
                                        item.list = {
                                            name: list_name
                                        }
                                        item.original = {
                                            list_id: list_id,
                                            user_id: user_id
                                        }
                                        new_items.push(item);
                                    }
                                    items = new_items;
                                }
                                res.json({
                                    error: 0,
                                    data: items
                                });
                            }
                        });
                    }
                });

            } else {
                res.json({
                    error: 1,
                    message: 'User Not Found'
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


//get friend list
router.all('/user/friends', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var skip = body.skip;
    if (!skip) {
        skip = 0;
    }

    var User = req.User;

    if (user_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }).populate({
            path: 'friends',
            options: {limit: 10, skip: skip * 10}
        }, function (err, result) {
            if (err) {
                next(err);
            } else {
                res.json({
                    error: 0,
                    data: result
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

//get follower list
router.all('/user/followers', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var skip = body.skip;
    if (!skip) {
        skip = 0;
    }

    var User = req.User;

    if (user_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }).populate({
            path: 'followers',
            options: {sort: {created_at: -1}, limit: 10, skip: skip * 10}
        }, function (err, result) {
            if (err) {
                next(err);
            } else {
                res.json({
                    error: 0,
                    data: result
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


//get following list
router.all('/user/following', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var skip = body.skip;
    if (!skip) {
        skip = 0;
    }

    var User = req.User;

    if (user_id) {
        User.find({
            followers: user_id
        }).limit(10).skip(skip * 10).lean().exec(function (err, following) {
            if (err) {
                next(err);
            } else {
                res.json({
                    error: 0,
                    data: following
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

//get full profile of users. used in myaccount page
router.all('/user/profile/full', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var me = body.me;
    var User = req.User;
    var Wishlist = req.Wishlist;
    if (user_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }).populate({
            path: 'followers',
            options: {sort: {created_at: -1}, limit: 10}
        }).populate({
            path: 'friends',
            options: {sort: {created_at: -1}, limit: 10}
        }).lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else if (row) {
                if (!me) {
                    row.friends = [];
                }
                Wishlist.find({
                    user_id: user_id
                }).lean().exec(function (err, lists) {
                    if (err) {
                        console.log(err);
                    }
                    if (!lists)
                        lists = [];
                    row.lists_mine = lists;

                    Wishlist.find({
                        followers: user_id
                    }).lean().exec(function (err, lists) {
                        if (err) {
                            console.log(err);
                        }
                        if (!lists)
                            lists = [];
                        row.lists_their = lists;

                        var list_ids = [];

                        for (var i = 0; i < row.lists_mine.length; i++) {
                            list_ids.push(row.lists_mine[i]._id);
                        }

//                        WishlistItemAssoc.find({
//                            list_id: {
//                                $in: list_ids
//                            }
//                        }).populate({
//                            path: 'item_id',
//                            options: {sort: {created_at: -1}}
//                        }).limit(pin_limit).lean().exec(function (err, items) {
//                            if (err) {
//                                console.log(err);
//                            }
//                            if (!items)
//                                items = [];
//                            row.pins = items;

                        User.find({
                            followers: user_id
                        }).limit(10).lean().exec(function (err, following) {
                            if (err) {
                                console.log(err);
                            } else {
                                row.following = following;
                            }
                            res.json({
                                error: 0,
                                data: row
                            });
                        });
//                        });

                    });
                });
            } else {
                res.json({
                    error: 0,
                    message: 'Invalid User ID'
                });
            }
        })
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }

})

router.all('/user/follow', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var follow_user_id = body.follow_user_id;
    var type = body.type;
    var User = req.User;
    if (user_id && follow_user_id) {
        if (user_id == follow_user_id) {
            res.json({
                error: 1,
                message: 'You Cannot Follow Yourself'
            });
            return;
        }
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }, function (err, me) {
            if (err) {
                next(err);
            } else {
                if (me) {

                    User.findOne({
                        _id: mongoose.Types.ObjectId(follow_user_id)
                    }, function (err, follow_user) {
                        if (err) {
                            next(err);
                        } else {
                            if (follow_user) {
                                var followers = follow_user.get('followers');
                                if (!followers) {
                                    followers = [];
                                }
                                if (type == 'add') {
                                    if (followers.indexOf(user_id) == -1) {
                                        followers.push(user_id);
                                        User.update({
                                            _id: mongoose.Types.ObjectId(follow_user_id)
                                        }, {
                                            $set: {
                                                followers: followers,
                                                'meta.followers': ((follow_user.get('meta.followers') * 1) + 1)
                                            }
                                        }, function (err) {
                                            if (err) {
                                                next(err);
                                            } else {
                                                res.json({
                                                    error: 0,
                                                    data: follow_user
                                                })
                                            }
                                        })
                                    } else {
                                        res.json({
                                            error: 1,
                                            message: 'Your Have Already Followed ' + follow_user.get('name')
                                        });
                                    }
                                } else {
                                    if (followers.indexOf(user_id) == -1) {
                                        res.json({
                                            error: 1,
                                            message: 'Your Are Not Following ' + follow_user.get('name')
                                        });
                                    } else {
                                        var new_followers = [];
                                        for (var i = 0; i < followers.length; i++) {
                                            if (followers[i] != user_id) {
                                                new_followers.push(new_followers[i]);
                                            }
                                        }

                                        User.update({
                                            _id: mongoose.Types.ObjectId(follow_user_id)
                                        }, {
                                            $set: {
                                                followers: new_followers,
                                                'meta.followers': ((follow_user.get('meta.followers') * 1) - 1)
                                            }
                                        }, function (err) {
                                            if (err) {
                                                next(err);
                                            } else {
                                                res.json({
                                                    error: 0,
                                                    data: follow_user
                                                })
                                            }
                                        })
                                    }
                                }
                            } else {
                                res.json({
                                    error: 1,
                                    message: 'User To Follow Not Found'
                                });
                            }
                        }
                    })

                } else {
                    res.json({
                        error: 1,
                        message: 'Invalid User ID'
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

router.all('/list/follow', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var list_id = body.list_id;
    var type = body.type;
    var User = req.User;
    var Wishlist = req.Wishlist;
    if (user_id && list_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }, function (err, me) {
            if (err) {
                next(err);
            } else {
                if (me) {

                    Wishlist.findOne({
                        _id: mongoose.Types.ObjectId(list_id)
                    }, function (err, follow_list) {
                        if (err) {
                            next(err);
                        } else {
                            if (follow_list) {

                                var list_type = follow_list.get('type');
                                if (list_type == 'private') {
                                    res.json({
                                        error: 1,
                                        data: 'This is a private list. Cannot Follow This List'
                                    })
                                    return;
                                }

                                var followers = follow_list.get('followers');
                                if (!followers) {
                                    followers = [];
                                }
                                if (type == 'add') {
                                    if (followers.indexOf(user_id) == -1) {
                                        followers.push(user_id);
                                        Wishlist.update({
                                            _id: mongoose.Types.ObjectId(list_id)
                                        }, {
                                            $set: {
                                                followers: followers
                                            }
                                        }, function (err) {
                                            if (err) {
                                                next(err);
                                            } else {

                                                var follow_user_id = follow_list.get('user_id');
                                                User.update({
                                                    _id: mongoose.Types.ObjectId(follow_user_id)
                                                }, {
                                                    '$inc': {
                                                        'meta.followers': 1
                                                    }
                                                }, function (err) {
                                                    if (err) {
                                                        next(err);
                                                    } else {
                                                        res.json({
                                                            error: 0,
                                                            data: follow_list
                                                        })
                                                    }
                                                });
                                            }
                                        })
                                    } else {
                                        res.json({
                                            error: 1,
                                            message: 'Your Have Already Followed ' + follow_list.get('name') + " List"
                                        });
                                    }
                                } else {
                                    if (followers.indexOf(user_id) == -1) {
                                        res.json({
                                            error: 1,
                                            message: 'Your Are Not Following ' + follow_list.get('name')
                                        });
                                    } else {
                                        var new_followers = [];
                                        for (var i = 0; i < followers.length; i++) {
                                            console.log(followers[i] + " == " + user_id);
                                            if (followers[i] != user_id) {
                                                new_followers.push(new_followers[i]);
                                            }
                                        }

                                        Wishlist.update({
                                            _id: mongoose.Types.ObjectId(list_id)
                                        }, {
                                            $set: {
                                                followers: new_followers
                                            }
                                        }, function (err) {
                                            if (err) {
                                                next(err);
                                            } else {
                                                var follow_user_id = follow_list.get('user_id');
                                                User.update({
                                                    _id: mongoose.Types.ObjectId(follow_user_id)
                                                }, {
                                                    '$inc': {
                                                        'meta.followers': -1
                                                    }
                                                }, function (err) {
                                                    if (err) {
                                                        next(err);
                                                    } else {
                                                        res.json({
                                                            error: 0,
                                                            data: follow_list
                                                        })
                                                    }
                                                });
                                            }
                                        })
                                    }
                                }
                            } else {
                                res.json({
                                    error: 1,
                                    message: 'List To Follow Not Found'
                                });
                            }
                        }
                    })

                } else {
                    res.json({
                        error: 1,
                        message: 'Invalid User ID'
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
router.all('/item/view/comment/:list_id/:item_id', function (req, res, next) {
    var item_id = req.params.item_id;
    var list_id = req.params.list_id;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    var User = req.User;
    if (item_id && list_id) {
        WishlistItemAssoc.findOne({
            item_id: item_id,
            list_id: list_id
        }).populate({
            path: 'comments',
            options: {
                sort: {
                    created_at: -1
                }
            }
        }).lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {
                    var k = 0;
                    var ret = [];
                    var comments = row.comments;
                    if (comments.length == 0) {
                        res.json({
                            error: 0,
                            data: ret
                        });
                    } else {
                        for (var i = 0; i < comments.length; i++) {
                            (function (comment) {
                                var user_id = comment.user_id;
                                User.findOne({
                                    _id: mongoose.Types.ObjectId(user_id)
                                }).lean().exec(function (err, user_row) {
                                    comment.picture = user_row.picture;
                                    comment.user_name = user_row.name;
                                    ret.push(comment);
                                    if (k == (comments.length - 1)) {
                                        res.json({
                                            error: 0,
                                            data: ret
                                        });
                                    }
                                    k++;
                                });
                            })(comments[i]);
                        }
                    }
                } else {
                    res.json({
                        error: 1,
                        message: 'Invalid Item ID'
                    })
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
router.all('/item/pins', function (req, res, next) {
    var body = req.body;
    var item_id = body.item_id;
    var WishlistItem = req.WishlistItem;
    var User = req.User;
    WishlistItem.findOne({
        _id: mongoose.Types.ObjectId(item_id)
    }).exec(function (err, result) {
        if (err) {
            next(err);
        } else {
            if (result) {

                var pins = result.get('pins');
                var ret = [];
                var k = 0;
                for (var i = 0; i < pins.length; i++) {

                    (function (pin) {
                        console.log(pin);
                        var user_id = pin.user_id;
                        User.findOne({
                            _id: mongoose.Types.ObjectId(user_id)
                        }).lean().exec(function (err, user_row) {
                            if (user_row)
                                ret.push(user_row);
                            if (k == (pins.length - 1)) {
                                res.json({
                                    error: 0,
                                    data: ret
                                });
                            }
                            k++;
                        });
                    })(pins[i]);
                }
            } else {
                res.json({
                    error: 1,
                    message: 'Invalid Item ID'
                });
            }
        }
    })
})
router.all('/item/likes', function (req, res, next) {
    var body = req.body;
    var item_id = body.item_id;
    var list_id = body.list_id;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    var User = req.User;
    WishlistItemAssoc.findOne({
        item_id: item_id,
        list_id: list_id
    }).exec(function (err, result) {
        if (err) {
            next(err);
        } else {
            if (result) {
                var likes = result.get('likes');
                var ret = [];
                for (var i = 0; i < likes.length; i++) {
                    var k = 0;
                    (function (like) {
                        var user_id = like.user_id;
                        User.findOne({
                            _id: mongoose.Types.ObjectId(user_id)
                        }).lean().exec(function (err, user_row) {
                            if (user_row)
                                ret.push(user_row);
                            if (k == (likes.length - 1)) {
                                res.json({
                                    error: 0,
                                    data: ret
                                });
                            }
                            k++;
                        });
                    })(likes[i]);
                }

            } else {
                res.json({
                    error: 1,
                    message: 'Invalid Item ID'
                });
            }
        }
    });
})
router.all('/user/followers', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var User = req.User;
    User.findOne({
        _id: mongoose.Types.ObjectId(user_id)
    }).populate('followers').exec(function (err, result) {
        if (err) {
            next(err);
        } else {
            if (result) {
                res.json({
                    error: 0,
                    data: result.get('followers')
                });
            } else {
                res.json({
                    error: 1,
                    message: 'Invalid User ID'
                });
            }
        }
    });
})
router.all('/list/followers', function (req, res, next) {
    var body = req.body;
    var list_id = body.list_id;
    var Wishlist = req.Wishlist;
    Wishlist.findOne({
        _id: mongoose.Types.ObjectId(list_id)
    }).populate('followers').exec(function (err, result) {
        if (err) {
            next(err);
        } else {
            if (result) {
                res.json({
                    error: 0,
                    data: result.get('followers')
                });
            } else {
                res.json({
                    error: 1,
                    message: 'Invalid List ID'
                });
            }
        }
    });
})
router.all('/item/comment', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var item_id = body.item_id;
    var list_id = body.list_id;
    var comment = body.comment;
    var picture = body.picture;
    var type = body.type;
    var WishlistItem = req.WishlistItem;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    var Comment = req.Comment;
    if (user_id && item_id && list_id) {

        if (comment && comment.length > 0) {

            if (use_akismat) {
                client.checkSpam({
                    user_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress, // Required!
                    user_agent: req.useragent, // Required!
                    referrer: 'http://google.co.in', // Required!
                    comment_content: comment
                }, function (err, spam) {
                    if (err) {
                        console.log('Error!');
                        console.log(err);
                    } else {
                        if (spam) {
                            console.log('OMG Spam!');
//                            res.json({
//                                error: 0,
//                                message: 'Comment Marked As Spam'
//                            });
//                            return;
                        } else {
                            console.log('Totally not spam');
                        }
                    }
                });
            }
        }

        WishlistItemAssoc.findOne({
            item_id: item_id,
            list_id: list_id
        }).populate('item_id list_id').lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                var comments = row.comments;
                if (!comments) {
                    comments = [];
                }
                if (type == 'add') {
                    var comment_model = new Comment({
                        user_id: user_id,
                        comment: comment,
                        picture: picture
                    });
                    comment_model.save(function (err) {
                        if (err) {
                            next(err);
                        } else {
                            comments.push(comment_model._id)
                            console.log(comments);
                            WishlistItemAssoc.update({
                                _id: row._id
                            }, {
                                $set: {
                                    comments: comments
                                }
                            }, function (err) {
                                if (err) {
                                    next(err);
                                } else {

//increment comment stats below only for unique users
                                    WishlistItem.update({
                                        _id: mongoose.Types.ObjectId(item_id)
                                    }, {
                                        $inc: {
                                            'meta.comments': 1
                                        }
                                    }, function (err) {
                                        if (err) {
                                            next(err);
                                        } else {
                                            res.json({
                                                error: 0,
                                                data: {
                                                    data: row,
                                                    comment_id: comment_model._id
                                                }
                                            })
//                                            var updater = require('../../modules/v1/update');
//                                            row.posted_by = user_id;
//                                            row.comment = comment;
//                                            updater.notification(row.list_id.user_id, 'comment', row, req, function (err) {
//                                                if (err) {
//                                                    console.log(err);
//                                                }
//                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else if (type == 'remove') {
                    var comment_id = body.comment_id;
                    Comment.remove({
                        _id: mongoose.Types.ObjectId(comment_id)
                    }, function (err) {
                        if (err) {
                            next(err);
                        } else {
                            var new_comment_ids = [];
                            var found = false;
                            for (var i = 0; i < comments.length; i++) {
                                if (comments[i] == comment_id) {
                                    found = true;
                                } else {
                                    new_comment_ids.push(comments[i])
                                }
                            }
                            if (found) {
                                WishlistItemAssoc.update({
                                    _id: row._id
                                }, {
                                    $set: {
                                        comments: comments
                                    }
                                }, function (err) {
                                    if (err) {
                                        next(err);
                                    } else {

                                        WishlistItem.update({
                                            _id: mongoose.Types.ObjectId(item_id)
                                        }, {
                                            $inc: {
                                                'meta.comments': -1
                                            }
                                        }, function (err) {
                                            if (err) {
                                                next();
                                            } else {
                                                res.json({
                                                    error: 0
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                res.json({
                                    error: 1,
                                    message: 'Comment Not Found'
                                });
                            }
                        }
                    });
                } else {
                    var comment_id = body.comment_id;
                    Comment.update({
                        _id: mongoose.Types.ObjectId(comment_id)
                    }, {
                        $set: {
                            picture: picture,
                            comment: comment
                        }
                    }, function (err) {
                        if (err) {
                            next(err);
                        } else {
                            res.json({
                                error: 0
                            })
                        }
                    })
                }
            }
        })
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
})

router.all('/item/pin', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var item_id = body.item_id;
    var list_id = body.list_id;
    var to_list_id = body.to_list_id;
    var WishlistItem = req.WishlistItem;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    if (user_id && item_id && list_id) {
        WishlistItemAssoc.findOne({
            item_id: item_id,
            list_id: to_list_id
        }).populate('item_id list_id').lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {
                    console.log(row);
                    res.json({
                        error: 0,
                        message: 'You Already Have This Item In Your List'
                    })
                } else {

                    WishlistItem.findOne({
                        _id: mongoose.Types.ObjectId(item_id)
                    }, function (err, item_row) {
                        if (err) {
                            next(err);
                        } else if (item_row) {

                            if (item_row.access_type == 'private') {
                                res.json({
                                    error: 1,
                                    message: 'Private Item Cannot Added To Your List'
                                });
                                return;
                            }

                            var pins = item_row.pins;
                            if (!pins) {
                                pins = [];
                            }
                            pins.push({
                                user_id: user_id
                            })
                            WishlistItem.update({
                                _id: mongoose.Types.ObjectId(item_id)
                            }, {
                                $set: {
                                    pins: pins
                                }
                            }, function (err) {
                                if (err) {
                                    next(err);
                                } else {
                                    var model = new WishlistItemAssoc({
                                        list_id: to_list_id,
                                        item_id: item_id
                                    });
                                    model.save(function (err) {
                                        if (err) {
                                            next(err);
                                        } else {
                                            res.json({
                                                error: 0
                                            })
                                        }
                                    });
                                }
                            });
                        } else {
                            res.json({
                                error: 1,
                                message: 'Item Not Found'
                            });
                        }
                    })

                }
            }
        })
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
})
router.all('/item/like', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var item_id = body.item_id;
    var list_id = body.list_id;
    var type = body.type;
    var Wishlist = req.Wishlist;
    var WishlistItem = req.WishlistItem;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    if (user_id && item_id) {
        console.log('item like request');
        WishlistItemAssoc.findOne({
            item_id: item_id,
            list_id: list_id
        }).populate('item_id list_id').lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row.list_id.user_id == user_id) {
                    res.json({
                        error: 1,
                        message: "You Can't Like Your Own Item"
                    });
                } else {
                    var likes = row.likes;
                    if (!likes) {
                        likes = [];
                    }
                    if (type == 'add') {
                        var found = false;
                        for (var i = 0; i < likes.length; i++) {
                            var like = likes[i];
                            if (like.user_id == user_id) {
                                found = true;
                            }
                        }
                        if (found) {
                            res.json({
                                error: 1,
                                message: "You Already Like This Item"
                            });
                        } else {
                            likes.push({
                                user_id: user_id
                            });
                            WishlistItemAssoc.update({
                                _id: row._id
                            }, {
                                $set: {
                                    likes: likes
                                }
                            }, function (err) {
                                if (err) {
                                    next(err);
                                } else {

                                    Wishlist.update({
                                        _id: mongoose.Types.ObjectId(list_id)
                                    }, {
                                        $inc: {
                                            'meta.likes': 1
                                        }
                                    }, function (err) {
                                        if (err) {
                                            next();
                                        } else {
                                            WishlistItem.update({
                                                _id: mongoose.Types.ObjectId(item_id)
                                            }, {
                                                $inc: {
                                                    'meta.likes': 1
                                                },
                                                updated_at: new Date()
                                            }, function (err) {
                                                if (err) {
                                                    next(err);
                                                } else {
//                                                    var updater = require('../../modules/v1/update');
                                                    row.posted_by = user_id;
//                                                    updater.notification(row.list_id.user_id, 'like', row, req, function (err) {
//                                                        if (err) {
//                                                            console.log(err);
//                                                        }
//
//                                                    });
                                                    res.json({
                                                        error: 0,
                                                        data: row
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    } else {
                        var found = false;
                        var new_likes = [];
                        for (var i = 0; i < likes.length; i++) {
                            var like = likes[i];
                            if (like.user_id == user_id) {
                                found = true;
                            } else {
                                new_likes.push(like);
                            }
                        }
                        if (!found) {
                            res.json({
                                error: 1,
                                message: "You Already Don't Like This Item"
                            });
                        } else {
                            WishlistItemAssoc.update({
                                _id: row._id
                            }, {
                                $set: {
                                    likes: new_likes
                                }
                            }, function (err) {
                                if (err) {
                                    next(err);
                                } else {
                                    Wishlist.update({
                                        _id: mongoose.Types.ObjectId(list_id)
                                    }, {
                                        $inc: {
                                            'meta.likes': -1
                                        }
                                    }, function (err) {
                                        if (err) {
                                            next();
                                        } else {
                                            WishlistItem.update({
                                                _id: mongoose.Types.ObjectId(item_id)
                                            }, {
                                                $inc: {
                                                    'meta.likes': -1
                                                },
                                                updated_at: new Date()
                                            }, function (err) {
                                                if (err) {
                                                    next(err);
                                                } else {
                                                    res.json({
                                                        error: 0,
                                                        data: row
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    }

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

router.all('/friends/list', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var User = req.User;
    if (user_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }).populate('friends').exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {
                    var friends = row.get('friends');
                    var ret = [];
                    for (var i = 0; i < friends.length; i++) {
                        ret.push({
                            id: friends[i].get('_id'),
                            name: friends[i].get('name'),
                            picture: friends[i].get('picture')
                        });
                    }
                    res.json({
                        error: 0,
                        data: ret
                    });
                } else {
                    res.json({
                        error: 1,
                        message: 'User Not Found'
                    })
                }
            }
        })
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});
module.exports = router;