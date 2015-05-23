var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var moment = require('moment-timezone');

router.all('/list', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var Wishlist = req.Wishlist;
    if (user_id) {
        Wishlist.find({
            user_id: user_id
        }, function (err, result) {
            if (err) {
                next(err);
            } else {

                Wishlist.find({
                    followers: user_id
                }, function (err, lists) {
                    if (err) {
                        next(err);
                    } else {

                        Wishlist.find({
                            shared_ids: user_id,
                            type: 'shared'
                        }).populate('user_id').exec(function (err, shared_lists) {
                            res.json({
                                error: 0,
                                data: {
                                    me: result,
                                    their: lists,
                                    shared: shared_lists
                                }
                            });
                        });
                    }
                })

            }
        })
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});

//delete list

router.all('/list/delete', function (req, res, next) {
    var body = req.body;
    var list_id = body.list_id;
    var user_id = body.user_id;

    var Wishlist = req.Wishlist;
    var WishlistItem = req.WishlistItem;

    if (list_id && user_id) {
        Wishlist.findOne({
            _id: mongoose.Types.ObjectId(list_id)
        }).lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row._id) {
                    console.log(row.user_id + "====" + user_id);
                    if (row && row.user_id == user_id) {
                        ;
                        WishlistItem.count({
                            'original.list_id': list_id
                        }, function (err, count) {
                            if (err) {
                                next(err);
                            } else {
                                if (count > 0) {
                                    res.json({
                                        error: 1,
                                        message: 'You Need To Empty The Wishlist To Delete!'
                                    });
                                } else {
                                    Wishlist.remove({
                                        _id: mongoose.Types.ObjectId(list_id)
                                    }, function (err) {
                                        if (err) {
                                            next(err);
                                        } else {
                                            res.json({error: 0});
                                        }
                                    });
                                }
                            }
                        });
                    } else {
                        res.json({
                            error: 1,
                            message: 'Wishlist Belongs To SomeOne Else, Cannot Delete'
                        });
                    }
                } else {
                    res.json({
                        error: 1,
                        message: 'Wishlist Not Found'
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

// add edit list
router.all('/add', function (req, res, next) {
    //below used for editing also
    var body = req.body;

    var name = body.name;
    var description = body.description;
    var type = body.type;
    var shared_ids = body.shared_ids;
    var user_id = body.user_id;
    var list_id = body.list_id;

    var Wishlist = req.Wishlist;
    var User = req.User;
    if (name && type && shared_ids && user_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }, function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {
                    var where = {
                        name: name,
                        user_id: user_id
                    };
                    if (list_id) {
                        where._id = {$ne: mongoose.Types.ObjectId(list_id)}
                    }
                    Wishlist.findOne(where, function (err, wish_row) {
                        if (err) {
                            next(err);
                        } else {
                            if (!wish_row) {
                                if (list_id) {
                                    Wishlist.findOne({
                                        _id: mongoose.Types.ObjectId(list_id)
                                    }, function (err, user_check) {
                                        if (err) {
                                            next(err);
                                        } else {
                                            if (user_check) {
                                                var list_user_id = user_check.get('user_id');
                                                if (user_id == list_user_id) {
                                                    Wishlist.update({
                                                        _id: user_check.get('_id')
                                                    }, {
                                                        $set: {
                                                            name: name,
                                                            description: description,
                                                            user_id: user_id,
                                                            type: type,
                                                            shared_ids: shared_ids
                                                        }
                                                    }, function (err) {
                                                        if (err) {
                                                            next(err);
                                                        } else {

                                                            User.update({
                                                                _id: mongoose.Types.ObjectId(user_id)
                                                            }, {
                                                                $inc: {
                                                                    "meta.lists": 1
                                                                }
                                                            }, function (err) {
                                                                if (err) {
                                                                    next();
                                                                } else {
                                                                    res.json({
                                                                        error: 0,
                                                                        data: {
                                                                            id: user_check.get('_id')
                                                                        }
                                                                    })
                                                                }
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    res.json({
                                                        error: 1,
                                                        message: 'Wishlist Belongs To Some One Else'
                                                    });
                                                }
                                            } else {
                                                res.json({
                                                    error: 1,
                                                    message: 'Wishlist Not Found'
                                                });
                                            }
                                        }
                                    })
                                } else {
                                    var wishlist = new Wishlist({
                                        name: name,
                                        description: description,
                                        user_id: user_id,
                                        type: type,
                                        shared_ids: shared_ids,
                                        likes: [],
                                        followers: []
                                    });
                                    wishlist.save(function (err) {
                                        if (err) {
                                            next(err);
                                        } else {
                                            res.json({
                                                error: 0,
                                                data: {
                                                    id: wishlist.get('_id')
                                                }
                                            });
                                        }
                                    });
                                }
                            } else {
                                res.json({
                                    error: 1,
                                    message: 'Wishlist With Same name Already Exists'
                                });
                            }
                        }
                    });
                } else {
                    res.json({
                        error: 1,
                        message: 'Invalid User ID'
                    });
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


//remove item from list
router.all('/item/remove', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var item_id = body.item_id;
    var list_id = body.list_id;

    var Wishlist = req.Wishlist;
    var WishlistItem = req.WishlistItem;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    var User = req.User;

    if (list_id && user_id && item_id) {
        Wishlist.findOne({
            _id: mongoose.Types.ObjectId(list_id)
        }, function (err, list) {
            if (err) {
                next(err);
            } else {
                if (list) {

                    WishlistItem.findOne({
                        _id: mongoose.Types.ObjectId(item_id)
                    }).lean().exec(function (err, item) {
                        if (item) {
                            WishlistItemAssoc.findOne({
                                item_id: item_id,
                                list_id: list_id
                            }).exec(function (err, item_assoc) {
                                if (err) {
                                    next(err);
                                } else {
                                    var likes_no = item_assoc.likes.length;

                                    Wishlist.update({
                                        _id: mongoose.Types.ObjectId(list_id)
                                    }, {
                                        $inc: {
                                            'meta.products': -1,
                                            'meta.likes': likes_no * -1
                                        }
                                    }, function (err) {
                                        if (err) {
                                            next(err);
                                        } else {


                                            User.update({
                                                _id: mongoose.Types.ObjectId(user_id)
                                            }, {
                                                $inc: {
                                                    'meta.products': -1
                                                }
                                            }, function (err) {
                                                if (err) {
                                                    next(err);
                                                } else {

                                                    WishlistItemAssoc.remove({
                                                        item_id: item_id,
                                                        list_id: list_id
                                                    }, function (err) {
                                                        if (err) {
                                                            next(err);
                                                        } else {
                                                            WishlistItemAssoc.count({
                                                                item_id: item_id
                                                            }, function (err, c) {
                                                                if (err) {
                                                                    next(err);
                                                                } else {
                                                                    if (c > 0) {
                                                                        if (item.original && item.original.user_id === user_id) {
                                                                            WishlistItem.update({
                                                                                _id: mongoose.Types.ObjectId(item_id)
                                                                            }, {
                                                                                $set: {
                                                                                    original: {
                                                                                    }
                                                                                }
                                                                            }, function (err) {
                                                                                if (err) {
                                                                                    next(err);
                                                                                } else {
                                                                                    res.json({error: 0});
                                                                                }
                                                                            });
                                                                        }
                                                                    } else {


                                                                        WishlistItem.remove({
                                                                            _id: mongoose.Types.ObjectId(item_id)
                                                                        }, function (err) {
                                                                            if (err) {
                                                                                next(err);
                                                                            } else {
                                                                                res.json({error: 0});
                                                                            }
                                                                        });

//                                                                        }
                                                                    }
                                                                }
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
                                message: 'Item Does Not Exist'
                            });
                        }
                    });

                } else {
                    res.json({
                        error: 1,
                        message: 'List Does Not Exist'
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

router.all('/leave_list', function (req, res, next) {
    var body = req.body;
    var list_id = body.list_id;
    var user_id = body.user_id;
    if (list_id && user_id) {
        req.list_helper.getListDetail(list_id, req, function (err, list_row) {
            if (err) {
                next(err);
            } else {
                if (list_row.type == 'shared') {
                    var shared_ids = list_row.shared_ids;
                    var new_shared_ids = [];
                    for (var i = 0; i < shared_ids.length; i++) {
                        if (shared_ids[i] != user_id) {
                            new_shared_ids.push(shared_ids[i]);
                        }
                    }
                    var Wishlist = req.Wishlist;
                    Wishlist.update({
                        _id: list_row._id
                    }, {
                        $set: {
                            shared_ids: new_shared_ids
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
                        message: 'This Is Not A Shared List!'
                    });
                }
            }
        });
    } else {
        res.json({
            error: 0,
            message: 'Invalid Request'
        });
    }
});
router.all('/item/list', function (req, res, next) {
    var body = req.body;
    //var user_id = body.user_id;
    var list_id = body.list_id;
    var page = req.body.page;
    if (!page) {
        page = 0;
    }

    var ignore_item_id = body.ignore_item_id;

    var Wishlist = req.Wishlist;
    var website_scrap_data = req.conn_website_scrap_data;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    if (list_id) {
        Wishlist.findOne({
            _id: mongoose.Types.ObjectId(list_id)
        }).populate('user_id shared_ids').exec(function (err, list) {
            if (err) {
                next(err);
            } else {
                if (list) {
                    WishlistItemAssoc.find({
                        list_id: list_id
                    }).populate({
                        path: 'item_id'
                    }).sort({created_at: -1}).skip(page * 10).limit(10).exec(function (err, data) {
                        if (err) {
                            next(err);
                        } else {
                            var ret = [];
                            var k = 0;
                            if (!data || data.length == 0) {
                                res.json({
                                    error: 0,
                                    data: {
                                        list: list,
                                        items: []
                                    }
                                });
                            } else {
                                for (var i = 0; i < data.length; i++) {
                                    (function (ff, i) {
                                        var wishlist_row = ff.get('item_id');

                                        if (!wishlist_row) {
                                            ret[i] = false;
                                            if (k == (data.length - 1)) {
                                                res.json({
                                                    error: 0,
                                                    data: {
                                                        list: list,
                                                        items: ret
                                                    }
                                                });
                                            }
                                            k++;
                                        } else {
                                            if (ignore_item_id && ignore_item_id == wishlist_row.get('_id') + "") {
                                                ret[i] = false;
                                                if (k == (data.length - 1)) {
                                                    res.json({
                                                        error: 0,
                                                        data: {
                                                            list: list,
                                                            items: ret
                                                        }
                                                    });
                                                }
                                                k++;
                                            } else if (wishlist_row.get('type') == 'product') {

                                                var unique = wishlist_row.get('unique');
                                                var website = wishlist_row.get('website');
                                                var prod = {};
                                                website_scrap_data.findOne({
                                                    unique: unique,
                                                    website: website
                                                }, function (err, row) {
                                                    if (err) {
                                                        console.log(err);
                                                    }

                                                    if (row) {
                                                        var name = row.get('name');
                                                        var brand = row.get('brand');
                                                        var img = row.get('img');
                                                        var href = row.get('href');
                                                        var price = row.get('price');
                                                        var website = row.get('website');
                                                    } else {
                                                        var name = wishlist_row.get('name');
                                                        var brand = wishlist_row.get('brand');
                                                        var img = wishlist_row.get('img');
                                                        var href = wishlist_row.get('url');
                                                        var price = wishlist_row.get('price');
                                                        var website = wishlist_row.get('website');
                                                    }
                                                    var created_at = wishlist_row.get('created_at');
                                                    prod._id = wishlist_row.get('_id');
                                                    prod.dimension = wishlist_row.get('dimension');
                                                    prod.name = name;
                                                    prod.image = img;
                                                    prod.website = website;
                                                    prod.type = wishlist_row.get('type');
                                                    prod.created_at = moment(created_at).tz('Asia/Calcutta').format('Do MMM h:mm a');
                                                    prod.list = {
                                                        name: list.get('name')
                                                    };
                                                    prod.user = {
                                                        picture: list.get('user_id').get('picture'),
                                                        name: list.get('user_id').get('name')
                                                    };
                                                    prod.original = {
                                                        user_id: list.get('user_id').get('_id'),
                                                        list_id: list.get('_id')
                                                    };
                                                    prod.meta = wishlist_row.get('meta');
                                                    var pins = wishlist_row.get('pins');
                                                    prod.meta.pins = pins.length;
                                                    prod.pins = pins;
                                                    prod.likes = ff.get('likes');
//                                                    ret.push(prod);
                                                    ret[i] = prod;
                                                    console.log(k + "==" + (data.length - 1));
                                                    if (k == (data.length - 1)) {
                                                        res.json({
                                                            error: 0,
                                                            data: {
                                                                list: list,
                                                                items: ret
                                                            }
                                                        });
                                                    }
                                                    k++;
                                                })
                                            } else {
                                                var prod = {};
                                                prod._id = wishlist_row.get('_id');
                                                prod.dimension = wishlist_row.get('dimension');
                                                prod.name = wishlist_row.get('name');
                                                prod.image = wishlist_row.get('img');
                                                prod.description = wishlist_row.get('description');
                                                prod.type = wishlist_row.get('type');
                                                var created_at = wishlist_row.get('created_at');
                                                prod.created_at = moment(created_at).tz('Asia/Calcutta').format('Do MMM h:mm a');
                                                prod.list = {
                                                    name: list.get('name')
                                                };
                                                prod.user = {
                                                    picture: list.get('user_id').get('picture'),
                                                    name: list.get('user_id').get('name')
                                                };
                                                prod.original = {
                                                    user_id: list.get('user_id').get('_id'),
                                                    list_id: list.get('_id')
                                                };
                                                prod.meta = wishlist_row.get('meta');
                                                var pins = wishlist_row.get('pins');
                                                prod.meta.pins = pins.length;
                                                prod.likes = ff.get('likes');
                                                prod.pins = pins;
//                                                ret.push(prod);
                                                ret[i] = prod;
                                                console.log(k + "==" + (data.length - 1));
                                                if (k == (data.length - 1)) {
                                                    res.json({
                                                        error: 0,
                                                        data: {
                                                            list: list,
                                                            items: ret
                                                        }
                                                    });
                                                }
                                                k++;
                                            }
                                        }
                                    })(data[i], i);
                                }
                            }
                        }
                    })
                } else {
                    res.json({
                        error: 1,
                        message: 'List Not Found'
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

function populateWishlistItem(row, req, done) {
    var type = row.item_id.type;
    var website_scrap_data = req.conn_website_scrap_data;
    var User = req.User;
    var user_id = row.list_id.user_id;
    User.findOne({
        _id: mongoose.Types.ObjectId(user_id)
    }).lean().exec(function (err, user_row) {
        if (err) {
            done(err);
        } else {
            row.user_id = user_row;
            if (type == 'product') {
                var website = row.item_id.website;
                var unique = row.item_id.unique;
                website_scrap_data.findOne({
                    website: website,
                    unique: unique
                }, function (err, product_row) {
                    if (product_row) {
                        var new_price = product_row.get('price');
                        var image = product_row.get('img');
                        var price_history = product_row.get('price_history');
                        if (!price_history) {
                            price_history = [];
                        }
                        row['price'] = new_price;
                        row['img'] = image;
                        row.price_history = price_history;
                        row.product_id = product_row.get('_id');
                        done(null, row);
                    } else {
                        done(null, row);
                    }

                });
            } else {
                done(null, row);
            }
        }
    })
}

router.all('/item/view/:item_id/:list_id', function (req, res, next) {
    var item_id = req.params.item_id;
    var list_id = req.params.list_id;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    var User = req.User;
    console.log(item_id + "XXX" + list_id);
    if (item_id && list_id) {
        WishlistItemAssoc.findOne({
            item_id: item_id,
            list_id: list_id
        }).populate('item_id list_id ').populate({
            path: 'comments',
            options: {
                limit: 20,
                sort: {
                    created_at: -1
                }
            }
        }).lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {
                    populateWishlistItem(row, req, function (err, row) {
                        if (err) {
                            next(err);
                        } else {

                            var likes = row.likes;
                            var pins = row.item_id.pins;
                            likes = likes.concat(pins);
                            var async = require('async');
                            async.mapLimit(likes, 3, function (like_row, callback) {
                                var user_id = like_row.user_id;
                                req.user_helper.getUserDetail(user_id, req, function (err, user_detail) {
                                    //like_row.user_id = user_detail;
                                    callback(err, user_detail);
                                });
                            }, function (err, result) {
                                row.loves = result;
                                if (row && row.location) {
                                    var location = row.location;
                                    var zoom = row.zoom;
                                    if (location && location.length > 0) {
                                        var new_location = {
                                            lat: location[1],
                                            lng: location[0],
                                            zoom: zoom
                                        };
                                        row.location = new_location;
                                    }
                                }
                                if (row.comments) {
                                    var comments = row.comments;
                                    var new_comments = [];
                                    var k = 0;
                                    if (row.comments.length > 0) {
                                        for (var i = 0; i < comments.length; i++) {
                                            (function (comment) {
                                                var user_id = comment.user_id;
                                                User.findOne({
                                                    _id: mongoose.Types.ObjectId(user_id)
                                                }).lean().exec(function (err, user_row) {
                                                    if (user_row) {
                                                        comment.picture = user_row.picture;
                                                        comment.user_name = user_row.name;
                                                    }
                                                    new_comments.push(comment);
                                                    if (k == (comments.length - 1)) {
                                                        row.comments = new_comments;
                                                        res.json({
                                                            error: 0,
                                                            data: row
                                                        });
                                                    }
                                                    k++;
                                                });
                                            })(comments[i]);
                                        }
                                    } else {
                                        row.comments = [];
                                        res.json({
                                            error: 0,
                                            data: row
                                        });
                                    }
                                }
                            });
                        }
                    })
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
})

//add item to wishlist

router.all('/item/add', function (req, res, next) {
    var body = req.body;
    var product_id = body.product_id;
    var user_id = body.user_id;
    var list_id = body.list_id;
    var type = body.type;
    var website_scrap_data = req.conn_website_scrap_data;
    var Wishlist = req.Wishlist;
    var User = req.User;
    var WishlistItem = req.WishlistItem;
    var WishlistItemAssoc = req.WishlistItemAssoc;
    if (user_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }, function (err, row) {
            if (err) {
                next(err);
            } else {

                var user_points = row.followers.length;
                if (row) {
                    Wishlist.findOne({
                        _id: mongoose.Types.ObjectId(list_id)
                    }, function (err, list) {
                        if (err) {
                            next(err);
                        } else {
                            var list_points = list.followers.length + list.meta.likes;
                            if (!list) {
                                res.json({
                                    error: 1,
                                    message: 'List Not Found'
                                });
                            } else {

                                var list_user_id = list.get('user_id');

                                var has_access = false;
                                if (list_user_id == user_id) {
                                    has_access = true;
                                } else if (list.type == 'shared') {
                                    var shared_ids = list.shared_ids;
                                    for (var i = 0; i < shared_ids.length; i++) {
                                        if (shared_ids[i] == user_id) {
                                            has_access = true;
                                        }
                                    }
                                }

                                if (!has_access) {
                                    res.json({
                                        error: 1,
                                        message: 'You Don\'t Have Access To This List'
                                    });
                                } else {

                                    if (type == 'product') {
                                        website_scrap_data.findOne({
                                            _id: mongoose.Types.ObjectId(product_id)
                                        }, function (err, product_row) {
                                            if (err) {
                                                next();
                                            } else {
                                                if (!product_row) {
                                                    res.json({
                                                        error: 1,
                                                        message: 'Product Not Found'
                                                    });
                                                } else {

                                                    var unique = product_row.get('unique');
                                                    var website = product_row.get('website');
                                                    var name = product_row.get('name');
                                                    var href = product_row.get('href');
                                                    var price = product_row.get('price');
                                                    var brand = product_row.get('brand');
                                                    var cat_id = product_row.get('cat_id');
                                                    var sub_cat_id = product_row.get('sub_cat_id');
                                                    var img = product_row.get('img');
                                                    WishlistItemAssoc.find({
                                                        list_id: list_id
                                                    }).populate({
                                                        path: 'item_id',
                                                        match: {
                                                            unique: unique,
                                                            website: website
                                                        }
                                                    }).lean().exec(function (err, rr) {
                                                        if (err) {
                                                            next(err);
                                                        } else {

                                                            var found = false;
                                                            for (var x = 0; x < rr.length; x++) {
                                                                if (rr[x].item_id && rr[x].item_id._id) {
                                                                    found = true;
                                                                }
                                                            }

                                                            if (found) {
                                                                res.json({
                                                                    error: 1,
                                                                    message: 'Product Already In Your Wishlist'
                                                                });
                                                            } else {
                                                                req.list_helper.getWishlistItemSize(img, req, function (err, data) {
                                                                    if (!err) {
                                                                        var new_image = data.filename;
                                                                        var dimension = data.size;
                                                                        var old_image = img;
                                                                    } else {
                                                                        var new_image = img;
                                                                        var dimension = {};
                                                                        var old_image = '';
                                                                    }
                                                                    var wish_model = new WishlistItem({
                                                                        name: name, href: href,
                                                                        img: new_image,
                                                                        org_img: old_image,
                                                                        dimension: dimension,
                                                                        website: website,
                                                                        brand: brand,
                                                                        price: price,
                                                                        cat_id: cat_id,
                                                                        sub_cat_id: sub_cat_id,
                                                                        expired: 0,
                                                                        unique: unique,
                                                                        type: 'product',
                                                                        access_type: list.type,
                                                                        original: {
                                                                            user_id: user_id,
                                                                            list_id: list_id
                                                                        },
                                                                        meta: {
                                                                            likes: 0,
                                                                            comments: 0,
                                                                            user_points: user_points,
                                                                            list_points: list_points
                                                                        }
                                                                    });
                                                                    wish_model.save(function (err) {
                                                                        if (err) {
                                                                            next(err);
                                                                        } else {

                                                                            var assoc_model = new WishlistItemAssoc({
                                                                                list_id: list_id,
                                                                                item_id: wish_model._id
                                                                            });
                                                                            assoc_model.save(function (err) {
                                                                                if (err) {
                                                                                    next(err);
                                                                                } else {
                                                                                    Wishlist.update({
                                                                                        _id: mongoose.Types.ObjectId(list_id)
                                                                                    }, {
                                                                                        $inc: {
                                                                                            "meta.products": 1
                                                                                        }
                                                                                    }, function (err) {

                                                                                        if (err) {
                                                                                            next(err);
                                                                                        } else {
                                                                                            User.update({
                                                                                                _id: mongoose.Types.ObjectId(user_id)
                                                                                            }, {
                                                                                                $inc: {
                                                                                                    "meta.products": 1
                                                                                                }
                                                                                            }, function (err) {
                                                                                                if (err) {
                                                                                                    next(err);
                                                                                                } else {

//                                                                                                    var updater = require('./../../modules/v1/update');
//                                                                                                    updater.notification(user_id, 'item_add', {
//                                                                                                        wishlist_model: wish_model,
//                                                                                                        list: list
//                                                                                                    }, req);

                                                                                                    //pushItemToUserFeed(list, wish_model.toObject(), row, req);
                                                                                                    res.json({
                                                                                                        error: 0,
                                                                                                        data: {
                                                                                                            id: wish_model._id,
                                                                                                            list: list,
                                                                                                            wishlist_model: wish_model,
                                                                                                            user: row
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                        }

                                                                                    })
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        }
                                                    });
                                                }
                                            }
                                        })
                                    } else {
                                        var file_name = body.item.file_name;
                                        var gfs = req.gfs;
                                        var fs = require('fs');
                                        var writestream = gfs.createWriteStream({
                                            filename: file_name
                                        });
                                        writestream.on('error', function (err) {
                                            console.log(err);
                                            next(err);
                                        })
                                        var dirname = require('path').dirname(__dirname) + '/../uploads/picture/';
                                        var read_stream = fs.createReadStream(dirname + file_name);
                                        read_stream.on('error', function (err) {
                                            console.log(err);
                                            next(err);
                                        })
                                        read_stream.pipe(writestream);
                                        writestream.on('close', function () {

                                            var item = {
                                                name: body.item.title,
                                                href: body.item.url,
                                                img: body.item.file_name,
                                                dimension: body.item.picture_size,
                                                description: body.item.description,
                                                type: 'custom',
                                                price: body.item.price,
                                                access_type: list.type,
                                                original: {
                                                    user_id: user_id,
                                                    list_id: list_id
                                                },
                                                meta: {
                                                    likes: 0,
                                                    comments: 0,
                                                    user_points: user_points,
                                                    list_points: list_points
                                                }

                                            };
                                            if (body.item.location && body.item.location.lng) {
                                                item['location'] = [body.item.location.lng, body.item.location.lat];
                                                item['zoom'] = body.item.location.zoom;
                                            }
                                            var wish_model = new WishlistItem(item);
                                            wish_model.save(function (err) {
                                                if (err) {
                                                    next(err);
                                                } else {


                                                    var assoc_model = new WishlistItemAssoc({
                                                        list_id: list_id,
                                                        item_id: wish_model._id
                                                    });
                                                    assoc_model.save(function (err) {
                                                        if (err) {
                                                            next(err);
                                                        } else {
                                                            Wishlist.update({
                                                                _id: mongoose.Types.ObjectId(list_id)
                                                            }, {
                                                                $inc: {
                                                                    "meta.products": 1
                                                                }
                                                            }, function (err) {
                                                                if (err) {
                                                                    next(err);
                                                                } else {
                                                                    //pushItemToUserFeed(list, wish_model.toObject(), row, req);
                                                                    res.json({
                                                                        error: 0,
                                                                        data: {
                                                                            id: wish_model._id,
                                                                            list: list,
                                                                            wishlist_model: wish_model,
                                                                            user: row
                                                                        }
                                                                    });
                                                                }
                                                            })
                                                        }
                                                    });
                                                }
                                            });
                                        });
                                    }
                                }
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

//below is not used, rather item is pushed in notify.js
function pushItemToUserFeed(list, wish_model, user, req) {
    var redis = req.redis;
    console.log(wish_model);
    wish_model.list = {
        name: list.name
    };
    wish_model.user = {
        name: user.name,
        picture: user.picture
    };
    wish_model.pins = wish_model.pins.length;
    wish_model.likes = wish_model.meta.likes;
    wish_model.user_points = wish_model.meta.user_points;
    wish_model.list_points = wish_model.meta.list_points;
    wish_model.original = JSON.stringify(wish_model.original);
    wish_model.dimension = JSON.stringify(wish_model.dimension);
    wish_model.user = JSON.stringify(wish_model.user);
    wish_model.list = JSON.stringify(wish_model.list);
    var shared_ids = list.shared_ids;
    var followers = list.followers;
    var user_followers = user.followers;
    if (shared_ids.length > 0) {
        for (var i = 0; i < shared_ids.length; i++) {
            //ltrim
            redis.lpush('user_feed_' + shared_ids[i], wish_model._id, function (err) {
                redis.incr('user_feed_unread_' + shared_ids[i]);
                redis.ltrim(['user_feed_' + shared_ids[i], 0, 100], function (err, res) {
                });
                //only push id, actual data will be taken at run time
//                if (err) {
//                    console.log('1014');
//                    console.log(err);
//                } else {
//                    redis.hmset('item_' + wish_model._id, wish_model, function (err) {
//                        if (err) {
//                            console.log('1019');
//                            console.log(err);
//                        }
//                        redis.expire('item_' + wish_model._id, 60 * 24 * 7, function (err) {
//                            if (err) {
//                                console.log('1024');
//                                console.log(err);
//                            }
//                        });
//                    });
//                }

            });
        }
    } else {
        if (list.type == 'public') {
            if (followers.length > 0) {
                for (var i = 0; i < followers.length; i++) {
                    redis.lpush('user_feed_' + followers[i], wish_model._id, function (err) {
                        redis.ltrim(['user_feed_' + shared_ids[i], 0, 100], function (err, res) {
                        });
                        if (err) {
                            console.log('1039');
                            console.log(err);
                        } else {
                            redis.hmset('item_' + wish_model._id, wish_model, function (err) {
                                if (err) {
                                    console.log('1045');
                                    console.log(err);
                                }
                                redis.expire('item_' + wish_model._id, 60 * 24 * 7, function (err) {
                                    if (err) {
                                        console.log('1050');
                                        console.log(err);
                                    }
                                });
                            });
                        }

                    });
                }
            }
            if (user_followers.length > 0) {
                for (var i = 0; i < user_followers.length; i++) {
                    if (followers.indexOf(user_followers[i]) !== -1) {
                        redis.lpush('user_feed_' + user_followers[i], wish_model._id, function (err) {
                            redis.ltrim(['user_feed_' + shared_ids[i], 0, 100], function (err, res) {
                            });
                            if (err) {
                                console.log('1063');
                                console.log(err);
                            } else {
                                redis.hmset('item_' + wish_model._id, wish_model, function (err) {
                                    if (err) {
                                        console.log('1069');
                                        console.log(err);
                                    }
                                    redis.expire('item_' + wish_model._id, 60 * 24 * 7, function (err) {
                                        if (err) {
                                            console.log('1073');
                                            console.log(err);
                                        }
                                    });
                                });
                            }
                        });
                    }
                }
            }
        }
    }

}
module.exports = router;
