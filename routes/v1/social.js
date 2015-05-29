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
////remove user as friend
router.all('/user/unfriend', function (req, res, next) {
    var body = req.body;
    var me_id = body.me_id;
    var friend_id = body.friend_id;
    var User = req.User;
    var User = req.User;
    if (me_id && friend_id) {

        User.findOne({
            _id: mongoose.Types.ObjectId(me_id)
        }).lean().exec(function (err, user_row) {
            if (err) {
                next(err);
            } else {
                if (user_row) {
                    var friends = user_row.friends;
                    if (!friends) {
                        friends = [];
                    }
                    var new_friends = [];
                    for (var i = 0; i < friends.length; i++) {
                        console.log(friends[i] + "=====" + friend_id);
                        if (friends[i] + "" !== friend_id + "") {
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
                            }).lean().exec(function (err, user_row) {
                                if (err) {
                                    next(err);
                                } else {
                                    var friends = user_row.friends;
                                    if (!friends) {
                                        friends = [];
                                    }

                                    var new_friends = [];
                                    for (var i = 0; i < friends.length; i++) {
                                        if (friends[i] + "" !== friend_id + "") {
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
//accept friend request
router.all('/user/acceptfriendrequest', function (req, res, next) {
    var body = req.body;
    var from_user_id = body.from_user_id;
    var to_user_id = body.to_user_id;
    var FriendRequest = req.FriendRequest;
    var User = req.User;
    if (from_user_id && to_user_id) {
        FriendRequest.findOne({
            from_user_id: from_user_id,
            to_user_id: to_user_id
        }, function (err, friend_row) {
            if (err) {
                next(err);
            } else {
                if (friend_row) {
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
                                        _id: friend_row.get('_id')
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
//decline friend request
router.all('/user/declinefriendrequest', function (req, res, next) {
    var body = req.body;
    var to_user_id = body.to_user_id;
    var from_user_id = body.from_user_id;
    var FriendRequest = req.FriendRequest;
    if (from_user_id && to_user_id) {
        FriendRequest.findOne({
            from_user_id: from_user_id,
            to_user_id: to_user_id
        }, function (err, friend_row) {
            if (err) {
                next(err);
            } else {
                if (friend_row) {
                    FriendRequest.update({
                        _id: friend_row.get('_id')
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
//send friend request
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
                                } else if (row.get('status') === 'declined') {
                                    res.json({
                                        error: 0,
                                        data: {
                                            status: 'declined',
                                            date: row.get('created_at')
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
                            path: 'item_id'
                        }).sort({created_at: -1}).limit(pin_limit).skip(skip * 1 * pin_limit).lean().exec(function (err, items) {
                            if (err) {
                                next(err);
                            } else {
                                if (!items)
                                    items = [];
                                else {
                                    var new_items = [];
//                                    console.log(items);
                                    for (var i = 0; i < items.length; i++) {
                                        var item = items[i].item_id;
                                        if (!item) {
                                            continue;
                                        }
                                        var list_id = items[i].list_id;
                                        var list_name = '';
                                        for (var j = 0; j < rows.length; j++) {
                                            if (rows[j]._id + "" === list_id + "") {
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
                                        item.likes = items[i].likes;
                                        item.meta.pins = item.pins.length;
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
        }).exec(function (err, result) {
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
        }).exec(function (err, result) {
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
//get list of friend request
//mainly user when a user vists another users profile page

router.all('/user/friend_requests', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var FriendRequest = req.FriendRequest;
    if (user_id) {
        FriendRequest.find({
            to_user_id: user_id
        }, function (err, data) {
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
            error: 1,
            message: 'Invalid Request'
        });
    }
});
//get full profile of users. used in myaccount page
router.all('/user/profile/full', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var my_id = body.my_id;
    var me = body.me;
    var User = req.User;
    var Wishlist = req.Wishlist;
    var FriendRequest = req.FriendRequest;
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

                console.log('account step1');

                req.user_helper.updateUserStats(row, req, function (err, new_user_row) {
                    if (new_user_row) {
                        row = new_user_row;
                        console.log('getting updated user');
                    }

                    console.log('account step2');
                    Wishlist.find({
                        user_id: user_id
                    }).sort({created_at: -1}).lean().exec(function (err, lists) {
                        if (err) {
                            console.log(err);
                        }
                        console.log('account step3');
                        if (!lists)
                            lists = [];
                        row.lists_mine = lists;
                        Wishlist.find({
                            followers: user_id
                        }).sort({created_at: -1}).lean().exec(function (err, lists) {
                            if (err) {
                                console.log(err);
                            }
                            console.log('account step4');
                            if (!lists)
                                lists = [];
                            row.lists_their = lists;
                            var list_ids = [];
                            for (var i = 0; i < row.lists_mine.length; i++) {
                                list_ids.push(row.lists_mine[i]._id);
                            }

                            Wishlist.find({
                                shared_ids: user_id,
                                type: 'shared'
                            }).sort({created_at: -1}).populate('user_id').exec(function (err, shared) {
                                if (err) {
                                    console.log(err);
                                }
                                console.log('account step5');
                                if (!shared)
                                    shared = [];
                                row.lists_shared = shared;
                                User.find({
                                    followers: user_id
                                }).limit(10).lean().exec(function (err, following) {
                                    console.log('account step6');
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        row.following = following;
                                    }

                                    FriendRequest.find({
                                        to_user_id: user_id,
                                        status: {$ne: 'declined'}
                                    }).populate('from_user_id').lean().exec(function (err, friend_requests) {
                                        row.friend_requests = friend_requests;
                                        //check if current user is following or is a friend
                                        // cannot check from above, because only loading 10 followers and friends
                                        console.log('account step7');
                                        if (me) {
                                            row.is_friend = false;
                                            row.is_following = false;
                                            res.json({
                                                error: 0,
                                                data: row
                                            });
                                        } else {

                                            User.findOne({
                                                _id: mongoose.Types.ObjectId(user_id)
                                            }, function (err, user_row) {
                                                console.log('account step8');
                                                row.is_friend = false;
                                                row.is_following = false;
                                                var friends = user_row.get('friends');
                                                var followers = user_row.get('followers');
                                                row.is_friend = false;
                                                row.is_following = false;
                                                for (var j = 0; j < friends.length; j++) {
                                                    if (friends[j] + "" === my_id + "") {
                                                        row.is_friend = true;
                                                        break;
                                                    }
                                                }
                                                for (var j = 0; j < followers.length; j++) {
                                                    if (followers[j] + "" === my_id + "") {
                                                        row.is_following = true;
                                                        break;
                                                    }
                                                }

                                                res.json({
                                                    error: 0,
                                                    data: row
                                                });
                                            });
                                        }
                                    });
                                });
                            });
                        });
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
                                                });
                                            }
                                        });
                                    } else {
                                        res.json({
                                            error: 1,
                                            message: 'You Are Already Following ' + follow_user.get('name')
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
                                        message: 'This is a private list. Cannot Follow This List'
                                    });
                                    return;
                                }
                                console.log(follow_list.get('user_id') + "XXX" + user_id);
                                if (follow_list.get('user_id') == user_id) {
                                    res.json({
                                        error: 1,
                                        message: 'You Cannot Follow Your Own List'
                                    });
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
});
router.all('/item/comment/unlike', function (req, res, next) {
    var comment_id = req.body.comment_id;
    var user_id = req.body.user_id;
    if (comment_id && user_id) {
        var Comment = req.Comment;
        Comment.findOne({
            _id: mongoose.Types.ObjectId(comment_id)
        }).lean().exec(function (err, data) {
            if (err) {
                next(err);
            } else {
                var likes = data.likes;
                if (!likes) {
                    likes = [];
                }
                var new_likes = [];
                for (var i = 0; i < likes.length; i++) {
                    var like = likes[i];
                    var like_user_id = like.user_id;
                    if (like_user_id + "" !== user_id + "") {
                        new_likes.push(like);
                    }
                }
                likes.push({
                    user_id: user_id
                });
                Comment.update({
                    _id: mongoose.Types.ObjectId(comment_id)
                }, {
                    $set: {
                        likes: new_likes
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
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});
router.all('/item/comment/like', function (req, res, next) {
    var comment_id = req.body.comment_id;
    var user_id = req.body.user_id;
    if (comment_id && user_id) {
        var Comment = req.Comment;
        Comment.findOne({
            _id: mongoose.Types.ObjectId(comment_id)
        }).lean().exec(function (err, data) {
            if (err) {
                next(err);
            } else {
                var likes = data.likes;
                if (!likes) {
                    likes = [];
                }
                var already_liked = false;
                for (var i = 0; i < likes.length; i++) {
                    var like = likes[i];
                    var like_user_id = like.user_id;
                    if (like_user_id + "" === user_id + "") {
                        already_liked = true;
                    }
                }
                if (already_liked) {
                    res.json({
                        error: 1,
                        message: 'You Have Already Liked This Comment'
                    });
                } else {
                    likes.push({
                        user_id: user_id
                    });
                    Comment.update({
                        _id: mongoose.Types.ObjectId(comment_id)
                    }, {
                        $set: {
                            likes: likes
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
            }
        });
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});
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
        }).populate('item_id list_id comments').lean().exec(function (err, row) {
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
                                if (comments[i]._id == comment_id) {
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
//    var to_list_id = body.to_list_id;
    var WishlistItem = req.WishlistItem;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    if (user_id && item_id && list_id) {
        WishlistItemAssoc.findOne({
            item_id: item_id,
            list_id: list_id
        }).populate('item_id list_id').lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row && row.item_id && row.list_id) {
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
                            if (item_row.original.user_id + "" === '54b5123ae7dc201818feb732') {
                                item_row.original.user_id = user_id;
                            }
                            if (item_row.original.list_id + "" === '552f5561e9cba6d52a155fda' || item_row.original.list_id + "" === '552f50bce9cba6d52a155fb6') {
                                item_row.original.list_id = list_id;
                            }
                            var pins = item_row.pins;
                            if (!pins) {
                                pins = [];
                            }
                            pins.push({
                                user_id: user_id
                            });
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
                                        list_id: list_id,
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
    if (user_id && item_id && list_id) {
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
                            picture: friends[i].get('picture'),
                            status: friends[i].get('status'),
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