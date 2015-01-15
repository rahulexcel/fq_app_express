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
                            res.json({
                                error: 0,
                                message: 'Comment Marked As Spam'
                            });
                            return;
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
                                    res.json({
                                        error: 0
                                    })
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
                            for (var i = 0; i < comments.length; i++) {
                                if (comments[i] != comment_id) {
                                    new_comment_ids.push(comments[i])
                                }
                            }
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
                                    res.json({
                                        error: 0
                                    })
                                }
                            });
                        }
                    })
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
    var WishlistItemAssoc = req.WishlistItemAssoc;
    if (user_id && item_id) {
        WishlistItemAssoc.findOne({
            item_id: item_id,
            list_id: list_id
        }).populate('item_id list_id').lean().exec(function (err, row) {
            if (err) {
                next(err);
            } else {
                if (row.list_id.user_id == user_id && false) {
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
                                        _id: mongoose.Types.Object(list_id)
                                    }, {
                                        $inc: {
                                            'meta.likes': 1
                                        }
                                    }, function (err) {
                                        if (err) {
                                            next();
                                        } else {
                                            var updater = require('../../modules/v1/update');
                                            updater.notification(row.list_id.user_id, 'like', row, req, function (err) {
                                                if (err)
                                                    next(err);
                                                res.json({
                                                    error: 0
                                                })
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
                                    res.json({
                                        error: 0
                                    })
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