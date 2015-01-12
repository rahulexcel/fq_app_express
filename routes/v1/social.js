var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var moment = require('moment-timezone');

router.all('/user/follow', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var follow_user_id = body.follow_user_id;
    var type = body.type;

    var User = req.User;
    if (user_id && follow_user_id) {
        User.findOne({
            _id: Mongoose.Types.Object(user_id)
        }, function (err, me) {
            if (err) {
                next(err);
            } else {
                if (me) {

                    User.findOne({
                        _id: Mongoose.Types.Object(follow_user_id)
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
                                            _id: Mongoose.Types.Object(follow_user_id)
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
                                            message: 'Your Have Already Followed '.follow_user.get('name')
                                        });
                                    }
                                } else {
                                    if (followers.indexOf(user_id) == -1) {
                                        res.json({
                                            error: 1,
                                            message: 'Your Are Not Following '.follow_user.get('name')
                                        });
                                    } else {
                                        var new_followers = [];
                                        for (var i = 0; i < new_followers.length; i++) {
                                            if (new_followers[i] != user_id) {
                                                followers.push(new_followers[i]);
                                            }
                                        }

                                        User.update({
                                            _id: Mongoose.Types.Object(follow_user_id)
                                        }, {
                                            $set: {
                                                followers: followers,
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
            _id: Mongoose.Types.Object(user_id)
        }, function (err, me) {
            if (err) {
                next(err);
            } else {
                if (me) {

                    Wishlist.findOne({
                        _id: Mongoose.Types.Object(list_id)
                    }, function (err, follow_list) {
                        if (err) {
                            next(err);
                        } else {
                            if (follow_list) {
                                var followers = follow_list.get('followers');
                                if (!followers) {
                                    followers = [];
                                }
                                if (type == 'add') {
                                    if (followers.indexOf(user_id) == -1) {
                                        followers.push(user_id);
                                        Wishlist.update({
                                            _id: Mongoose.Types.Object(list_id)
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
                                                    _id: Mongoose.Types.ObjectId(follow_user_id)
                                                }, {
                                                    $set: {
                                                        '$inc': {
                                                            'meta.followers': 1
                                                        }
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
                                            message: 'Your Have Already Followed '.follow_list.get('name') + " List"
                                        });
                                    }
                                } else {
                                    if (followers.indexOf(user_id) == -1) {
                                        res.json({
                                            error: 1,
                                            message: 'Your Are Not Following '.follow_list.get('name')
                                        });
                                    } else {
                                        var new_followers = [];
                                        for (var i = 0; i < new_followers.length; i++) {
                                            if (new_followers[i] != user_id) {
                                                followers.push(new_followers[i]);
                                            }
                                        }

                                        Wishlist.update({
                                            _id: Mongoose.Types.Object(list_id)
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
                                                    _id: Mongoose.Types.ObjectId(follow_user_id)
                                                }, {
                                                    $set: {
                                                        '$inc': {
                                                            'meta.followers': -1
                                                        }
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