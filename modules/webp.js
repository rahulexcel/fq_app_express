//small module to check webp support based on request headers


module.exports = function (mongoose) {

    return function (req, res, next) {
        var ua = require('useragent');
        require('useragent/features');

        if (req.headers.accept && req.headers.accept.indexOf('image/webp') !== -1) {
            req.webp = true;
        } else {
            var uaString = req.headers['user-agent'],
                    is = ua.is(uaString),
                    agent = ua.parse(uaString);
            if ((is.chrome && agent.satisfies('>=23.0.0'))
                    || (is.opera && agent.satisfies('>=12.1'))
                    || (is.android && agent.satisfies('>=4.0'))) {
                req.webp = true;
            }
        }
        next();

    };
};