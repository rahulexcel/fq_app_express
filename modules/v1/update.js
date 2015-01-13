module.exports = {
    notification: function (user_id, type, data, req, done) {
        var Updates = req.Updates;
        var model = new Updates({
            user_id: user_id,
            type: type,
            date: data,
            gcm_data: {}
        });
        model.save(function (err) {
            if (done)
                done(err);
        });
    },
    profileItemUpdate: function (item, list, user, req, done) {

    },
    sendData: function (data, isd_objs, key, done) {
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
        var sender = new gcm.Sender('AIzaSyABDceQztvkstpKksCz86-hQAFeshqoBV4');
        var registrationIds = [];
        for (var i = 0; i < isd_objs.length; i++) {
            var row = isd_objs[i];
            registrationIds.push(row);
        }

        sender.send(message, registrationIds, 4, function (err, result) {
            console.log(err);
            console.log(result);
            if (done) {
                done(err, result);
            }
        });
    }
}
