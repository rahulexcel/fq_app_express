var express = require('express');
var router = express.Router();


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
