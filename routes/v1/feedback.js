var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var moment = require('moment-timezone');

router.all('/add', function (req, res, next) {
    var body = req.body;

    var Feedback = req.Feedback;

    var feedback_obj = new Feedback(body);

    var feedback_subject = 'Fashioniq App Feedback';
    var feedback_msg = '';
    var feedback_body = body.feedback;
    if (typeof feedback_body.email != 'undefined') {
        feedback_msg += 'Email  :: ' + feedback_body.email + '<br>';
    } else {
    }
    if (typeof feedback_body.text != 'undefined') {
        feedback_msg += 'Feedback  :: ' + feedback_body.text + '<br>';
    }
    feedback_msg += '<pre>' + JSON.stringify(body.feedback) + '</pre>';
    feedback_msg += '<pre>' + JSON.stringify(body.device) + '</pre>';
    var adminFeedbackAlert = {
        subject: feedback_subject,
        body: feedback_msg,
    };
    req.mailer.send('manish@excellencetechnologies.in', feedback_subject, 'template', adminFeedbackAlert);


    feedback_obj.save(function (err) {
        if (err) {
            next(err);
        } else {
            res.json({error: 0, data: {}});
        }
    });

});

module.exports = router;
