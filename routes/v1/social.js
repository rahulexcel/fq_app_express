var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var moment = require('moment-timezone');

router.all('/user/follow', function (req, res, next) {

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