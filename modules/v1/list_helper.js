var mongoose = require('mongoose');

module.exports = function () {

    var list_helper = {};
    list_helper.getListDetail = function (list_id, req, done) {
        var Wishlist = req.Wishlist;
        Wishlist.findOne({
            _id: mongoose.Types.ObjectId(list_id)
        }).lean().exec(function (err, row) {
            if (err) {
                done(err);
            } else {
                done(null, row);
            }
        });

    };
    return function (req, res, next) {
        req.list_helper = list_helper;
        next();
    };
}