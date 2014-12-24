var express = require('express');
var router = express.Router();


router.get('/signup', function (req, res) {
    var body = req.body;
    var user = body.user;

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
        }
        password = user.password;
    }
    user.password = password;
    user.type = type;
    var name = user.name;

    var User = req.User;

    if (name && name.length > 0 && password && password.length > 0 && email && email.length > 0) {

        User.findOne({
            email: email
        }).exec(function (err, row) {
            if (err) {
                res.json({
                    error: 2,
                    message: err.err
                });
            } else {

                if (row) {
                    if (is_auto_password) {
                        if (type == 'facebook') {
                            if (user.get('fb_id') != -1) {
                                if (row.fb_id == user.get('fb_id')) {

                                } else {
                                    res.json({
                                        error: 1,
                                        message: 'Access Denied'
                                    });
                                    return;
                                }
                            } else {

                                User.update({
                                    _id: row.get('_id')
                                }, {
                                    $set: {
                                        fb_id: row.fb_id
                                    }
                                });

                            }
                        }
                        if (type == 'google') {
                            if (user.get('google_id') == -1) {
                                if (row.google_id == user.get('google_id')) {

                                } else {
                                    res.json({
                                        error: 1,
                                        message: 'Access Denied'
                                    });
                                    return;
                                }
                            } else {
                                User.update({
                                    _id: row.get('_id')
                                }, {
                                    $set: {
                                        google_id: row.google_id
                                    }
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
                        if (pass_md5 == row.password) {

                        } else {
                            res.json({
                                error: 1,
                                message: 'Access Denied. Invalid Password'
                            });
                            return;
                        }
                    }
                    res.json({
                        error: 0,
                        data: {
                            id: row.get('_id'),
                            email: row.get('email')
                        }
                    });


                } else {

                    var crypto = require('crypto');
                    var md5 = crypto.createHash('md5');
                    md5.update(password);
                    var pass_md5 = md5.digest('hex');
                    user.password = pass_md5;

                    if (!user.fb_id) {
                        user.fb_id = -1;
                    }
                    if (!user.google_id) {
                        user.google_id = -1;
                    }

                    //send new account email with email/pass
                    var model = new User(user);
                    model.save(function (err) {
                        if (err) {
                            res.json({
                                error: 2,
                                message: err.err
                            });
                        } else {
                            var id = model._id;
                            res.json({
                                error: 0,
                                data: {
                                    id: id,
                                    email: model.email
                                }
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
