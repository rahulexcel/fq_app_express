var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var moment = require('moment-timezone');

router.all('/add', function (req, res, next) {
    var body = req.body;

    var Feedback = req.Feedback;

    var feedback_obj = new Feedback(body);
    feedback_obj.save(function (err) {
        if (err) {
            next(err);
        } else {
            res.json({error: 0, data: {}});
        }
    });

});

module.exports = router;
