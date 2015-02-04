var express = require('express');
var fs = require('fs');
var router = express.Router();
var mongoose = require('mongoose');
var sharp = require('sharp');
var zlib = require('zlib');
var request = require('request');
var fs = require('fs');
var urlMod = require('url');
var cheerio = require('cheerio');
var phantom = require('phantom');


function getHTML2(url, callback) {

    var parsed_url = urlMod.parse(url);
    if (!parsed_url['hostname']) {
        return callback('Invalid URL');
    }

    var headers = {
        "accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
        "accept-language": "en-US,en;q=0.8",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2",
        "accept-encoding": "gzip,deflate",
    };

    var options = {
        url: url,
        headers: headers
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
                    callback(err, decoded && decoded.toString(), res.headers['content-type']);
                });
            } else if (encoding == 'deflate') {
                zlib.inflate(buffer, function (err, decoded) {
                    callback(err, decoded && decoded.toString(), res.headers['content-type']);
                })
            } else {
                callback(null, buffer.toString(), res.headers['content-type']);
            }
        });
    });
    req.on('error', function (err) {
        callback(err);
    });
}

/*
 * Method to extract all images from a html page
 */

router.get('/extract', function (req, res, next) {
    var url = req.query.url;
    if (url) {
        url = decodeURIComponent(url);
        console.log(url);
        var parsed_url = urlMod.parse(url);
        if (!parsed_url['hostname']) {
            res.json({
                error: 1,
                message: 'Invalid URL'
            });
        }
        var images = [];
        phantom.create(function (ph) {
            ph.createPage(function (page) {
                //page.set('javascriptEnabled', false);
                page.set('userAgent', "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2");
                page.open(url, function (status) {
                    page.set('scrollPosition', {top: 1000, left: 0}, function (res1) {
                        console.log(res1);
                        res.json({
                            error: 0,
                            data: images
                        });
                        ph.exit();
                    });
                });
                page.set('onResourceReceived', function (url_res) {
                    var contentType = url_res.contentType;
                    if (contentType && contentType.indexOf('image/') != -1) {
                        var bodySize = url_res.bodySize;
                        if (bodySize && bodySize > 1000) {
                            var ignore = ['logo', 'loader', 'sprite', 'header', 'footer'];
                            var found = false;
                            for (var i = 0; i < ignore.length; i++) {
                                if (url_res.url.toLowerCase().indexOf(ignore[i]) !== -1) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found)
                                images.push(url_res.url);
                        }
                    }
                });
            });
        });
    } else {
        res.json({
            error: 1,
            message: 'Invalid Request'
        });
    }
});
/** 
 * Method To Make Product Image URL of website internal
 */
router.get('/images/:id', function (req, res, next) {
    var website_scrap_data = req.conn_website_scrap_data;
    var id = req.param('id');
    if (id) {
        var dirname = require('path').dirname(__dirname) + '/../uploads/images/' + id;
        var fs = require('fs');
        if (fs.existsSync(dirname) && false) {
            var steam = fs.createReadStream(dirname);
            res.set('Content-Type', 'image/jpeg');
            steam.pipe(res);
        } else {
            website_scrap_data.findOne({
                _id: mongoose.Types.ObjectId(id)
            }, function (err, row) {
                if (row) {
                    var url = row.get('img');
                    console.log(url);
                    getHTML2(url, function (err, data, mime) {
                        if (!err) {

                            fs.writeFile(dirname, data, function (err) {
                                if (!err) {
                                    var steam = fs.createReadStream(dirname);
                                    res.set('Content-Type', 'image/jpeg');
                                    steam.pipe(res);
                                } else {
                                    next(err);
                                }
                            });

//                        res.send(data);
//                        return;
                        }
                    });
                }
            });
        }
    }
//    res.set('Content-Type', 'image/gif');
//    var text = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
//    res.send(text);

});

/**
 * View any single file uploaded
 */
router.get('/view/:filename/', function (req, res, next) {
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
                if (req.query.webp) {
                    var mime = 'image/webp';
                } else {
                    var mime = 'image/png';
                }
                res.set('Content-Type', mime);
                var dirname = require('path').dirname(__dirname) + '/../uploads/picture/';
                var fs_filename = dirname + filename;
                if (req.query.width && req.query.height) {
                    var transformer = sharp().resize(req.query.width * 1, req.query.height * 1);
                    fs_filename = fs_filename + "_width_" + req.query.width + "_height_" + req.query.height;
                    if (req.query.webp) {
                        transformer.webp();
                        fs_filename = fs_filename + "_webp";
                    } else {
                        fs_filename = fs_filename + "_png";
                        transformer.png();
                    }
                    if (fs.existsSync(fs_filename)) {
                        var read_stream = fs.createReadStream(fs_filename);
                        read_stream.pipe(res);
                    } else {
                        var read_stream = gfs.createReadStream({filename: filename});
                        read_stream.pipe(transformer).pipe(res);
                        read_stream.on('end', function () {
                            var writestream = fs.createWriteStream(fs_filename);
                            read_stream.pipe(transformer).pipe(writestream);
                        });
                    }
                } else if (req.query.width) {
                    var transformer = sharp().resize(req.query.width * 1);
                    fs_filename = fs_filename + "_width_" + req.query.width;
                    if (req.query.webp) {
                        transformer.webp();
                        fs_filename = fs_filename + "_webp";
                    } else {
                        transformer.png();
                        fs_filename = fs_filename + "_png";
                    }
                    if (fs.existsSync(fs_filename)) {
                        var read_stream = fs.createReadStream(fs_filename);
                        read_stream.pipe(res);
                    } else {
                        var read_stream = gfs.createReadStream({filename: filename});
                        read_stream.pipe(transformer).pipe(res);
                        read_stream.on('end', function () {
                            var writestream = fs.createWriteStream(fs_filename);
                            read_stream.pipe(transformer).pipe(writestream);
                        });

                    }
                } else {
                    if (fs.existsSync(fs_filename)) {
                        var read_stream = fs.createReadStream(fs_filename);
                        read_stream.pipe(res);
                    } else {
                        var read_stream = gfs.createReadStream({filename: filename});
                        read_stream.pipe(res);
                        read_stream.on('end', function () {
                            var writestream = fs.createWriteStream(fs_filename);
                            read_stream.pipe(transformer).pipe(writestream);
                        });
                    }
                }
            } else {
                res.status(500);
                res.json('File Not Found');
            }
        });
    } else {
        res.sendStatus(500);
    }
});

/*
 * Upload a picture
 */
router.all('/upload', function (req, res, next) {
    var gfs = req.gfs;
    var body = req.body;
    var size = body.size;
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

                var dimensions = false;
                if (size) {
                    var sizeOf = require('image-size');
                    dimensions = sizeOf(dirname + "/../" + path);
                }
                fs.unlink(dirname + "/../" + path);
                res.json({
                    error: 0,
                    data: mongo_filename,
                    size: dimensions
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
