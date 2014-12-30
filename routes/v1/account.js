var express = require('express');
var fs = require('fs');
var router = express.Router();
var mongoose = require('mongoose');

router.all('/update', function (req, res) {
    var body = req.body;
    var user_id = body.user_id;

    var name = body.name;
    var password = body.pass;
    var UserModel = req.User;
    if (user_id) {
        if (name.length > 0) {
            UserModel.update({
                _id: mongoose.Types.ObjectId(user_id)
            }, {
                $set: {
                    name: name
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
router.all('/remove_picture', function (req, res) {
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
router.all('/picture/view/:filename', function (req, res) {
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

router.all('/picture', function (req, res) {
    var gfs = req.gfs;
    var body = req.body;
    var user_id = body.user_id;

    if (req.files && user_id) {
        console.log(req.files);
        var filename = req.files.file.name;
        var path = req.files.file.path;
        var type = req.files.file.mimetype;
        console.log('file upload for ' + user_id);
        if (type.indexOf('image') != -1) {
            var dirname = require('path').dirname(__dirname);

            var mongo_filename = req.files.file.name;
            console.log(dirname + "/../" + path);
            var read_stream = fs.createReadStream(dirname + "/../" + path);
            var writestream = gfs.createWriteStream({
                filename: mongo_filename
            });
            writestream.on('error', function (err) {
                console.log(err);
            })
            read_stream.on('error', function (err) {
                console.log(err);
            })
            read_stream.pipe(writestream);
            writestream.on('close', function () {
                var UserModel = req.User;
                UserModel.update({
                    _id: mongoose.Types.ObjectId(user_id)
                }, {
                    $set: {
                        picture: filename
                    }
                }, function (err) {
                    if (err) {
                        next(err);
                    } else {
                        res.json({
                            error: 0,
                            data: mongo_filename
                        });
                    }
                })
            });
        } else {
            res.json({
                error: 1,
                message: 'Only JPG, PNG and GIF files accepted.'
            });
        }
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request. No File Uploaded'
        });
    }

})

router.all('/create', function (req, res) {
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
    var type = 'signup';
    var is_auto_password = false;
    if (user.fb_id) {
        type = 'facebook';
        password = generatePassword(6);
        is_auto_password = true;
    } else if (user.google_id) {
        type = 'google';
        password = generatePassword(6);
        is_auto_password = true;
    } else if (user.google_play) {
        type = 'google_play';
        password = generatePassword(6);
        is_auto_password = true;
    } else {
        if (!user.name) {
            user.name = 'XXX';
            type = 'login';
        }
        password = user.password;
    }
    user.password = password;
    user.type = type;
    var name = user.name;
    var UserModel = req.User;

    var userObj = user;

    if (name && name.length > 0 && password && password.length > 0 && email && email.length > 0) {

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
                    if (is_auto_password) {
                        if (type == 'facebook') {
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
                        }
                        if (type == 'google') {
                            if (user.get('google_id') * 1 != -1) {
                                if (userObj.google_id == user.get('google_id')) {

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
                                        google_id: userObj.google_id
                                    }
                                }, function (err) {
                                });
                            }
                        }
                        if (type == 'google_play') {

                        }
                    } else {
                        var crypto = require('crypto');
                        var md5 = crypto.createHash('md5');
                        md5.update(password);
                        var pass_md5 = md5.digest('hex');
                        console.log(pass_md5 + 'xxx' + userObj.password);
                        if (pass_md5 == user.get('password')) {

                        } else {
                            res.json({
                                error: 1,
                                message: 'Access Denied. Invalid Password'
                            });
                            return;
                        }
                    }
                    var user = {
                        id: user.get('_id'),
                        email: user.get('email'),
                        name: user.get('name'),
                        picture: user.get('picture')
                    };
                    res.json({
                        error: 0,
                        data: user
                    });


                } else {


                    var crypto = require('crypto');
                    var md5 = crypto.createHash('md5');
                    md5.update(password);
                    var pass_md5 = md5.digest('hex');
                    userObj.password = pass_md5;

                    if (!userObj.fb_id) {
                        userObj.fb_id = -1;
                    }
                    if (!userObj.google_id) {
                        userObj.google_id = -1;
                    }

                    //send new account email with email/pass
                    var model = new UserModel(userObj);
                    model.save(function (err) {
                        if (err) {
                            next(err);
                        } else {
                            var id = model._id;
                            userObj.id = id;
                            res.json({
                                error: 0,
                                data: userObj
                            });
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

module.exports = router;
