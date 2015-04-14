var mongoose = require('mongoose');

module.exports = function () {

    var user_helper = {};
    user_helper.updateUserStatsObject = function (user_obj, req, done) {
        var updated_at = user_obj.updated_at;
        if (!updated_at) {
            updated_at = new Date(1987, 04, 06);
            //just some random old date
        }

        var cur_time = new Date().getTime();
        var update_at_time = updated_at.getTime();
        if (cur_time - update_at_time > 24 * 1000 * 60 * 60) {
            //update user stats
            var Wishlist = req.Wishlist;
            var WishlistItemAssoc = req.WishlistItemAssoc;
            var User = req.User;
            //followers
            //products
            //lists

            var followers_no = user_obj.followers.length;
            var lists_no = user_obj.meta.lists;
            var products = user_obj.meta.products;
            var friends_no = user_obj.friends.length;

            Wishlist.find({
                user_id: user_obj._id
            }).lean().exec(function (err, lists) {
                if (!err) {
                    lists_no = lists.length;

                    var list_ids = [];
                    for (var i = 0; i < lists.length; i++) {
                        list_ids.push(lists[i]);
                    }

                    WishlistItemAssoc.count({
                        list_id: {
                            $in: list_ids
                        }
                    }, function (err, yy) {
                        if (!err) {
                            products = yy;
                        }
                        console.log('products ' + products);
                        User.update({
                            _id: user_obj._id
                        }, {
                            $set: {
                                'meta.followers': followers_no * 1,
                                'meta.products': products * 1,
                                'meta.lists': lists_no * 1,
                                'meta.friends': friends_no * 1,
                                updated_at: updated_at
                            }
                        }, function (err) {
                            if (err) {
                                done(err);
                            } else {
                                user_obj.meta.followers = followers_no * 1;
                                user_obj.meta.products = products * 1;
                                user_obj.meta.lists = lists_no * 1;
                                user_obj.meta.friends = friends_no * 1;

                                done(false, user_obj);
                            }
                        });
                    });
                } else {
                    done(err);
                }
            })

        } else {
            done(false, user_obj);
        }
    };
    user_helper.updateUserStats = function (user, req, done) {
        if (typeof user === 'string') {
            user_helper.getUserDetail(user, req, function (err, user_row) {
                if (err) {
                    done(err);
                } else {
                    user_helper.updateUserStatsObject(user_row, req, done);
                }
            });
        } else {
            user_helper.updateUserStatsObject(user, req, done);
        }
    };
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