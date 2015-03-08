var express = require('express');
var fs = require('fs');
var router = express.Router();
var mongoose = require('mongoose');

function updateFriends(me, row, req, res, done) {
    var User = req.User;
    if (row) {
        var user_friends = row.get('friends');
        var me_id = me.get('_id') + "";
        if (user_friends.indexOf(me_id) == -1) {
            user_friends.push(me_id);
            User.update({
                _id: row.get('_id')
            }, {
                $set: {
                    friends: user_friends
                }
            }, function (err) {
                if (err) {
                    console.log('error updating your friends list')
                }
                done();
            });
        } else {
            done();
        }
    } else {
        done();
    }
}

router.all('/google/lookup', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var google_data = body.google_data;
    if (user_id && google_data) {

        if (google_data.length == 0) {
            res.json({
                error: 0
            })
            return;
        }


        var User = req.User;
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }).exec(function (err, me) {
            if (err) {
                next(err);
            } else if (me) {

                var k = 0;
                var friends = me.get('friends');
                var friends_data = [];
                for (var i = 0; i < google_data.length; i++) {
                    var row = google_data[i];
                    var google_id = row.id;
                    User.findOne({
                        google_id: google_id
                    }).exec(function (err, row) {
                        if (row) {
                            var friend_id = row.get('_id') + "";
                            if (friends.indexOf(friend_id) == -1) {
                                friends.push(friend_id);
                                friends_data.push({
                                    name: row.get('name'),
                                    picture: row.get('picture'),
                                    type: 'google',
                                    created_at: row.get('created_at')
                                })
                            }
                        }
                        updateFriends(me, row, req, res, function () {
                            if (k == (google_data.length - 1)) {
                                User.update({
                                    _id: me.get('_id')
                                }, {
                                    $set: {
                                        friends: friends
                                    }
                                })
                                res.json({
                                    error: 0,
                                    data: friends_data
                                });
                            }
                            k++;
                        })
                    });
                }
            } else {
                res.json({
                    error: 1,
                    message: 'User Not Found'
                });
            }
        }
        );
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});

router.all('/facebook/lookup', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var fb_data = body.fb_data;
    if (user_id && fb_data) {

        if (fb_data.length == 0) {
            res.json({
                error: 0
            });
            return;
        }


        var User = req.User;
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }).exec(function (err, me) {
            if (err) {
                next(err);
            } else if (me) {

                var k = 0;
                var friends = me.get('friends');
                var friends_data = [];
                for (var i = 0; i < fb_data.length; i++) {
                    var row = fb_data[i];
                    var fb_id = row.id;
                    User.findOne({
                        fb_id: fb_id
                    }).exec(function (err, row) {
                        if (row) {
                            var friend_id = row.get('_id') + "";
                            if (friends.indexOf(friend_id) == -1) {
                                friends.push(friend_id);
                                friends_data.push(row);
                            }
                        }
                        updateFriends(me, row, req, res, function () {
                            if (k == (fb_data.length - 1)) {
                                console.log(friends);
                                User.update({
                                    _id: me.get('_id')
                                }, {
                                    $set: {
                                        friends: friends
                                    }
                                }, function (err) {
                                    if (err) {
                                        console.log('erring when updating');
                                        console.log(err);
                                    }
                                })
                                res.json({
                                    error: 0,
                                    data: friends_data
                                });
                            }
                            k++;
                        })
                    });
                }
            } else {
                res.json({
                    error: 1,
                    message: 'User Not Found'
                });
            }
        }
        );
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});
module.exports = router;