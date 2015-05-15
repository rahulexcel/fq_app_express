var urlMod = require('url');
var request = require('request');
var zlib = require('zlib');

module.exports = function () {

    var html_helper = {};
    html_helper.getImage = function (url, callback, timeout) {
        var parsed_url = urlMod.parse(url);
        if (!parsed_url['hostname']) {
            return callback('Invalid URL');
        }

        var r = request.head(url);
        r.on('error', function (err) {
            callback(err);
        });
        r.on('response', function () {
            var headers = {
//            "accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
//            "accept-language": "en-US,en;q=0.8",
//            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2",
//            "accept-encoding": "gzip,deflate",
            };

            var options = {
                url: url,
                headers: headers
            };
            if (timeout) {
                options['timeout'] = timeout;
            }
            var r = request.get(options);
            callback(false, r);
        });


    };
    return function (req, res, next) {
        req.html_helper = html_helper;
        next();
    };
}