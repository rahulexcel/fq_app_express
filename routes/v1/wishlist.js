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

                        res.json({
                            error: 0,
                            data: {
                                me: result,
                                their: lists
                            }
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

})

router.all('/item/list', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var list_id = body.list_id;
    var User = req.User;

    var WishlistItem = req.WishlistItem;
    var website_scrap_data = req.conn_website_scrap_data;

    var WishlistItemAssoc = req.WishlistItemAssoc;

    if (user_id && list_id) {
        User.findOne({
            _id: mongoose.Types.ObjectId(user_id)
        }, function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row) {

                    WishlistItemAssoc.find({
                        list_id: list_id
                    }).populate({
                        path: 'item_id'
                    }).sort({created_at: -1}).exec(function (err, data) {
                        if (err) {
                            next(err);
                        } else {
                            var ret = [];
                            var k = 0;
                            if (!data || data.length == 0) {
                                res.json({
                                    error: 0,
                                    data: []
                                });
                            } else {
                                for (var i = 0; i < data.length; i++) {
                                    (function (ff) {
                                        var wishlist_row = ff.get('item_id');
                                        if (wishlist_row.get('type') == 'product') {

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
                                                prod.name = name;
                                                prod.brand = brand;
                                                prod.img = img;
                                                prod.href = href;
                                                prod.price = price;
                                                prod.website = website;
                                                prod.type = row.get('type');

                                                prod.created_at = moment(created_at).tz('Asia/Calcutta').format('Do MMM h:mm a');

                                                ret.push(prod);
                                                console.log(k + "==" + (data.length - 1));
                                                if (k == (data.length - 1)) {
                                                    res.json({
                                                        error: 0,
                                                        data: ret
                                                    });
                                                }
                                                k++;
                                            })
                                        } else {
                                            var prod = {};
                                            prod._id = wishlist_row.get('_id');
                                            prod.name = wishlist_row.get('name');
                                            prod.img = wishlist_row.get('img');
                                            prod.href = wishlist_row.get('href');
                                            prod.description = wishlist_row.get('description');
                                            prod.location = wishlist_row.get('location');
                                            prod.type = wishlist_row.get('type');
                                            var created_at = wishlist_row.get('created_at');

                                            prod.created_at = moment(created_at).tz('Asia/Calcutta').format('Do MMM h:mm a');

                                            ret.push(prod);
                                            console.log(k + "==" + (data.length - 1));
                                            if (k == (data.length - 1)) {
                                                res.json({
                                                    error: 0,
                                                    data: ret
                                                });
                                            }
                                            k++;
                                        }
                                    })(data[i]);
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
                        done(err);
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

    if (item_id && list_id) {
        WishlistItemAssoc.findOne({
            item_id: item_id,
            list_id: list_id
        }).populate('item_id list_id ').populate({
            path: 'comments',
            options: {
                limit: 5,
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
                            res.json({
                                error: 0,
                                data: row
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
}
)
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
                if (row) {
                    Wishlist.findOne({
                        _id: mongoose.Types.ObjectId(list_id)
                    }, function (err, list) {
                        if (err) {
                            next(err);
                        } else {

                            if (!list) {
                                res.json({
                                    error: 1,
                                    message: 'List Not Found'
                                });
                            } else {

                                var list_user_id = list.get('user_id');
                                if (list_user_id != user_id) {
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
                                                    }).exec(function (err, rr) {
                                                        if (err) {
                                                            next(err);
                                                        } else {
                                                            if (rr && rr.length > 0) {
                                                                res.json({
                                                                    error: 1,
                                                                    message: 'Product Already In Your Wishlist'
                                                                });
                                                            } else {


                                                                var wish_model = new WishlistItem({
                                                                    name: name, href: href,
                                                                    img: img,
                                                                    website: website,
                                                                    brand: brand,
                                                                    price: price,
                                                                    cat_id: cat_id,
                                                                    sub_cat_id: sub_cat_id,
                                                                    expired: 0,
                                                                    unique: unique,
                                                                    type: 'product'
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
                                                                                                //var updater = require('./../../modules/v1/update');
                                                                                                //updater.profileItemUpdate(wish_model, list, row, req);
                                                                                                res.json({
                                                                                                    error: 0,
                                                                                                    data: {
                                                                                                        id: wish_model._id
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
                                                            }
                                                        }
                                                    });
                                                }
                                            }
                                        })
                                    } else {
                                        var item = {
                                            name: body.item.title,
                                            href: body.item.url,
                                            img: body.item.picture,
                                            description: body.item.description,
                                            type: 'custom'

                                        };
                                        if (body.item.location) {
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
                                                                res.json({
                                                                    error: 0,
                                                                    data: {
                                                                        id: wish_model._id
                                                                    }
                                                                });
                                                            }
                                                        })
                                                    }
                                                });

                                            }
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

module.exports = router;
