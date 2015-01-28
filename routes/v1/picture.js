var express = require('express');
var fs = require('fs');
var router = express.Router();
var mongoose = require('mongoose');
var sharp = require('sharp');
var zlib = require('zlib');

var request = require('request');
var cheerio = require('cheerio');

function getHTML(url, callback) {
    var headers = {};
    headers['user-agent'] = 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7';
    var options = {
        url: url,
        headers: headers,
        timeout: 10000
    };
    var req = request.get(options);
    req.on('response', function (res) {
        var chunks = [];
        res.on('data', function (chunk) {
            chunks.push(chunk);
        });
        res.on('end', function () {
            var buffer = Buffer.concat(chunks);
            var encoding = res.headers['content-encoding'];
            if (encoding == 'gzip') {
                zlib.gunzip(buffer, function (err, decoded) {
                    callback(err, decoded && decoded.toString());
                });
            } else if (encoding == 'deflate') {
                zlib.inflate(buffer, function (err, decoded) {
                    callback(err, decoded && decoded.toString());
                })
            } else {
                callback(null, buffer.toString());
            }
        });
    });
    req.on('error', function (err) {
        callback(err);
    });
}

router.get('/url/parse', function (req, res, next) {
    var body = req.body;
    var url = req.query.url;
    console.log('URL ' + url);
    if (url) {
        getHTML(url, function (err, html) {
            if (err) {
                next(err);
            } else {
                $ = cheerio.load(html);

                var title = $('title').first().html();
                var og_found = false;
                var metas = $('meta');
                var og_image = '';
                var og_name = '';
                metas.each(function (i, ele) {
                    if ($(ele).attr('property') == 'og:image') {
                        og_found = true;
                        og_image = $(ele).attr('content');
                    }
                    if ($(ele).attr('property') == 'og:name') {
                        og_name = $(ele).attr('content');
                    }
                });

                if (og_found) {
                    res.json({
                        error: 0,
                        data: {
                            title: title,
                            image: {
                                name: og_name,
                                image: og_image
                            }
                        }
                    });
                } else {

//                    $('html').find('img').each(function (i, ele) {
//                        console.log($(ele).attr('src'));
//                    });

                    res.json({
                        error: 0,
                        data: {
                            title: title
                        }
                    });
                }
            }
        })

    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});
router.get('/view/:filename', function (req, res, next) {
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
                var mime = 'image/webp';
                res.set('Content-Type', mime);
                var read_stream = gfs.createReadStream({filename: filename});
                if (req.query.width && req.query.height) {
                    var transformer = sharp().resize(req.query.width * 1, req.query.height * 1).webp();
                    read_stream.pipe(transformer).pipe(res);
                } else if (req.query.width) {
                    var transformer = sharp().resize(req.query.width * 1).webp();
                    read_stream.pipe(transformer).pipe(res);
                } else {
                    read_stream.pipe(res);
                }
            } else {
                res.status(500);
                res.json('File Not Found');
            }
        });

    } else {
        res.sendStatus(500);
    }
})

router.all('/upload', function (req, res, next) {
    var gfs = req.gfs;
    var body = req.body;

    if (req.files) {
        console.log(req.files);
        var filename = req.files.file.name;

        if (filename.indexOf('?') != -1) {
            filename = filename.substring(0, filename.indexOf('?'));
        }
        console.log('new file name ' + filename);

        var path = req.files.file.path;
        var type = req.files.file.mimetype;
        if (type.indexOf('image') != -1) {
            var dirname = require('path').dirname(__dirname);

            var crypto = require('crypto');
            var md5 = crypto.createHash('md5');
            md5.update(filename + new Date().getTime());

            var mongo_filename = md5.digest('hex');
            console.log(dirname + "/../" + path);
            var read_stream = fs.createReadStream(dirname + "/../" + path);
            var writestream = gfs.createWriteStream({
                filename: mongo_filename
            });
            writestream.on('error', function (err) {
                console.log(err);
                next(err);
            })
            read_stream.on('error', function (err) {
                console.log(err);
                next(err);
            })
            read_stream.pipe(writestream);
            writestream.on('close', function () {

                fs.unlink(dirname + "/../" + path);

                res.json({
                    error: 0,
                    data: mongo_filename
                });
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

module.exports = router;
