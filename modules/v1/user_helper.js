var mongoose = require('mongoose');

module.exports = function () {

    var user_helper = {};
    user_helper.getUserDetail = function (user_id, req, done) {
        var User = req.User;
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }).lean().exec(function (err, row) {
            if (err) {
                done(err);
            } else {
                done(null, row);
            }
        });

    };
    return function (req, res, next) {
        req.user_helper = user_helper;
        next();
    };
}