var mongoose = require('mongoose');
module.exports = {
    notification: function (user_id, type, data, req, done) {
        var Updates = req.Updates;
        var User = req.User;
        if (type == 'like' || type == 'comment') {
            var new_data = {};
            var posted_by = data.posted_by;
            User.findOne({
                _id: mongoose.Types.ObjectId(posted_by)
            }, function (err, user_row) {
                if (!user_row) {
                    done();
                    return;
                } else {
                    var posted_by_name = user_row.get('name');
                    var item_name = data.item_id.name;
                    var item_href = data.item_id.href;
                    var website = data.item_id.website;
                    var brand = data.item_id.brand;

                    var message = '';
                    if (type == 'comment') {
                        message = data.comment;
                    }
                    new_data = {
                        title: posted_by_name + " commented on you item ",
                        message: message,
                        data: {
                            item_id: data.item_id._id,
                            list_id: data.list_id._id,
                            list_name: data.list_id.name,
                            item_picture: data.item_id.img,
                            item_name: data.item_id.name

                        }
                    };
                }
            })

        }
        var model = new Updates({
            user_id: user_id,
            type: type,
            date: data,
            gcm_data: {}
        });
        var context = this;
        model.save(function (err) {
            var key = false;
            if (type == 'comment') {
                key = 'comment_' + data._id;
            }
            context.sendData(data, [user_id], key, done);
        });
    },
    profileItemUpdate: function (item, list, user, req, done) {

    },
    sendData: function (data, user_ids, key, done) {
        var gcm = require('node-gcm');
        if (!key) {
            key = new Date().getTime();
        }
        var moment = require('moment-timezone');
        var time = moment().tz("Asia/Kolkata").format('h:mm a Do, MMM YY');
        data.timeStamp = time;
        var message = new gcm.Message({
            collapseKey: key,
            delayWhileIdle: true,
            timeToLive: 60 * 60 * 4,
            data: data
        });
        var GCM = req.GCM;
        var sender = new gcm.Sender('AIzaSyABDceQztvkstpKksCz86-hQAFeshqoBV4');
        var registrationIds = [];
        for (var i = 0; i < user_ids.length; i++) {
            var user_id = user_ids[i];
            var k = 0;
            GCM.find({
                user_id: user_id
            }, function (err, rows) {
                if (rows) {
                    for (var j = 0; j < rows.length; j++) {
                        registrationIds.push(rows[i].reg_id);
                        if (k == (user_ids.length - 1)) {
                            sender.send(message, registrationIds, 4, function (err, result) {
                                console.log(err);
                                console.log(result);
                                if (done) {
                                    done(err, result);
                                }
                            });
                        }
                    }
                }
                k++;
            });
        }

    }
}
