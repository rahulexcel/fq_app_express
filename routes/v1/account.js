var express = require('express');
var fs = require('fs');
var router = express.Router();
var mongoose = require('mongoose');

router.all('/update', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;

    var profile = body.profile;
    var password = body.password;
    var UserModel = req.User;
    if (user_id) {
        if (profile) {
            UserModel.update({
                _id: mongoose.Types.ObjectId(user_id)
            }, {
                $set: profile
            }, function (err) {
                if (err) {
                    next(err);
                } else {
                    res.json({
                        error: 0
                    });
                }
            })
        } else if (password.length > 0) {
            var crypto = require('crypto');
            var md5 = crypto.createHash('md5');
            md5.update(password);
            var pass_md5 = md5.digest('hex');
            UserModel.update({
                _id: mongoose.Types.ObjectId(user_id)
            }, {
                $set: {
                    password: pass_md5
                }
            }, function (err) {
                if (err) {
                    next(err);
                } else {
                    res.json({
                        error: 0
                    });
                }
            })
        } else {
            res.send({
                error: 1,
                message: 'Invalid Request'
            });
        }
    } else {
        res.send({
            error: 1,
            message: 'Invalid Request'
        });
    }

})
router.all('/remove_picture', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var UserModel = req.User;
    if (user_id) {
        UserModel.update({
            _id: mongoose.Types.ObjectId(user_id)
        }, {
            $set: {
                picture: ''
            }
        }, function (err) {
            if (err) {
                next(err);
            } else {
                res.json({
                    error: 0
                });
            }
        })
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});
router.all('/picture/view/:filename', function (req, res, next) {
    var filename = req.param('filename');
    console.log(filename + 'filename');
    if (filename) {
        var gfs = req.gfs;

        gfs.files.find({filename: filename}).toArray(function (err, files) {

            if (err) {
                next(err);
            }
            if (files.length > 0) {
                console.log(files);
                var mime = 'image/jpeg';
                res.set('Content-Type', mime);
                var read_stream = gfs.createReadStream({filename: filename});
                read_stream.pipe(res);
            } else {
                res.status(500);
                res.json('File Not Found');
            }
        });

    } else {
        res.sendStatus(500);
    }
})

router.all('/update/picture', function (req, res, next) {
    var body = req.body;
    var user_id = body.user_id;
    var picture = body.picture;

    if (picture && user_id) {
        var UserModel = req.User;
        UserModel.update({
            _id: mongoose.Types.ObjectId(user_id)
        }, {
            $set: {
                picture: picture
            }
        }, function (err) {
            if (err) {
                next(err);
            } else {
                res.json({
                    error: 0
                });
            }
        })
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request. No File Uploaded'
        });
    }
})
function addAuth(user, device, req, res, next) {
    var auth_strategy = req.auth_strategy;
    auth_strategy.createAuth(user.id, device, req, function (err, data) {
        if (err) {
            next(err);
        } else {
            console.log('login auth data');
            console.log(data);
            user.api_key = data.api_key;
            user.api_secret = data.api_secret;
            console.log(user);
            res.json({
                error: 0,
                data: user
            });
        }
    });
}
router.all('/create/facebook', function (req, res, next) {
    var body = req.body;
    var user = body.user;

    if (!user) {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
        return;
    }

    var generatePassword = require('password-generator');

    var email = user.email;
    var password = '';
    var name = user.name;

    if (user.fb_id && name && name.length > 0 && email && email.length > 0) {
        var type = 'facebook';
        password = generatePassword(6);
        user.password = password;
        user.type = type;
        var device = user.device;
        var name = user.name;
        var UserModel = req.User;

        var userObj = user;

        UserModel.findOne({
            email: email
        }).exec(function (err, user) {
            if (err) {
                next(err);
            } else {
                if (user) {
                    if (type == 'signup') {
                        res.json({
                            error: 1,
                            message: 'Account Already Exists!'
                        });
                        return;
                    }
                    if (user.get('fb_id') * 1 != -1) {
                        if (userObj.fb_id == user.get('fb_id')) {

                        } else {
                            res.json({
                                error: 1,
                                message: 'Access Denied'
                            });
                            return;
                        }
                    } else {

                        UserModel.update({
                            _id: user.get('_id')
                        }, {
                            $set: {
                                fb_id: userObj.fb_id
                            }
                        }, function (err) {

                        });

                    }
                    var user = {
                        id: user.get('_id'),
                        email: user.get('email'),
                        name: user.get('name'),
                        picture: user.get('picture'),
                        gender: user.get('gender')
                    };
                    addAuth(user, device, req, res, next);
                } else {
                    var crypto = require('crypto');
                    var md5 = crypto.createHash('md5');
                    md5.update(password);
                    var pass_md5 = md5.digest('hex');
                    userObj.password = pass_md5;
                    userObj.google_id = -1;

                    //send new account email with email/pass
                    var model = new UserModel(userObj);
                    model.save(function (err) {
                        if (err) {
                            next(err);
                        } else {
                            var id = model._id;
                            userObj.id = id;
                            addAuth(userObj, device, req, res, next);
                        }
                    });

                }

            }
        });

    } else {
        res.json({
            error: 1,
            message: 'InComplete Details'
        });
    }
})


router.all('/create/google', function (req, res, next) {
    var body = req.body;
    var user = body.user;

    if (!user) {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
        return;
    }
    var name = user.name;
    var generatePassword = require('password-generator');

    var email = user.email;
    var password = '';
    var UserModel = req.User;

    var userObj = user;

    if (user.google_id && name && name.length > 0 && email && email.length > 0) {
        var name = user.name;
        var type = 'google';
        user.password = password;
        user.type = type;
        var device = user.device;
        password = generatePassword(6);
        UserModel.findOne({
            email: email
        }).exec(function (err, user) {
            if (err) {
                next(err);
            } else {
                if (user) {
                    if (user.get('google_id') * 1 != -1) {
                        if (userObj.google_id == user.get('google_id')) {

                        } else {
                            res.json({
                                error: 1,
                                message: 'Access Denied'});
                            return;
                        }
                    } else {
                        UserModel.update({
                            _id: user.get('_id')
                        }, {
                            $set: {
                                google_id: userObj.google_id
                            }
                        }, function (err) {
                        });

                    }
                    var user = {
                        id: user.get('_id'),
                        email: user.get('email'),
                        name: user.get('name'),
                        picture: user.get('picture'),
                        gender: user.get('gender')
                    };
                    addAuth(user, device, req, res, next);


                } else {
                    var crypto = require('crypto');
                    var md5 = crypto.createHash('md5');
                    md5.update(password);
                    var pass_md5 = md5.digest('hex');
                    userObj.password = pass_md5;
                    userObj.fb_id = -1;

                    //send new account email with email/pass
                    var model = new UserModel(userObj);
                    model.save(function (err) {
                        if (err) {
                            next(err);
                        } else {
                            var id = model._id;
                            userObj.id = id;
                            addAuth(userObj, device, req, res, next);
                        }
                    });

                }

            }
        });

    } else {
        res.json({
            error: 1,
            message: 'InComplete Details'
        });
    }
});

router.all('/create', function (req, res, next) {
    var body = req.body;
    var user = body.user;

    if (!user) {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
        return;
    }

    var email = user.email;
    var password = '';
    var type = 'signup';
    var device = user.device;
    password = user.password;
    user.type = type;
    var name = user.name;
    var UserModel = req.User;

    user.picture = 'http://' + req.get('host') + '/images/dummy.png';
    var userObj = user;

    if (name && name.length > 0 && password && password.length > 0 && email && email.length > 0) {
        UserModel.findOne({
            email: email
        }).exec(function (err, user) {
            if (err) {
                next(err);
            } else {
                if (user) {
                    res.json({
                        error: 1,
                        message: 'Account Already Exists!'
                    });
                } else {


                    var crypto = require('crypto');
                    var md5 = crypto.createHash('md5');
                    md5.update(password);
                    var pass_md5 = md5.digest('hex');
                    userObj.password = pass_md5;
                    userObj.fb_id = -1;
                    userObj.google_id = -1;

                    //send new account email with email/pass
                    var model = new UserModel(userObj);
                    model.save(function (err) {
                        if (err) {
                            next(err);
                        } else {
                            var id = model._id;
                            userObj.id = id;
                            addAuth(userObj, device, req, res, next);
                        }
                    });

                }

            }
        });

    } else {
        res.json({
            error: 1,
            message: 'InComplete Details'
        });
    }
});

router.all('/logout', function (req, res, next) {
    var body = req.body;
    var api_key = body.api_key;

    if (api_key) {
        var auth_strategy = req.auth_strategy;
        auth_strategy.removeAuth(api_key, req, res, next);
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
})

router.all('/login', function (req, res, next) {

    var body = req.body;
    var user = body.user;

    if (!user) {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
        return;
    }


    var email = user.email;
    var password = '';
    password = user.password;
    var device = user.device;
    var UserModel = req.User;

    var userObj = user;

    if (password && password.length > 0 && email && email.length > 0) {
        UserModel.findOne({
            email: email
        }).lean().exec(function (err, user) {
            if (err) {
                next(err);
            } else {
                if (user) {
                    var crypto = require('crypto');
                    var md5 = crypto.createHash('md5');
                    md5.update(password);
                    var pass_md5 = md5.digest('hex');
                    console.log(pass_md5 + 'xxx' + userObj.password);
                    if (pass_md5 == user.password) {
                        user.id = user._id;
                        addAuth(user, device, req, res, next);
                    } else {
                        res.json({
                            error: 1,
                            message: 'Access Denied. Invalid Password'
                        });
                    }
                } else {
                    res.json({
                        error: 1,
                        message: 'Email ID Doesn\'t Exist'
                    });

                }

            }
        });

    } else {
        res.json({
            error: 1,
            message: 'InComplete Details'
        });
    }
})
module.exports = router;
