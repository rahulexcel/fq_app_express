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
//var phantom = require('phantom');


/*
 * Method to extract all images from a html page
 */

router.get('/extract', function (req, res, next) {
    res.json({
        error: 0,
        message: 'Method Disabled'
    });
    return;
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


/** when user adds a new pin through image url. save that url to folder **/
router.get('/get_url', function (req, res, next) {
    var url = req.query.url;

    var fs = require('fs');
    var sharp = require('sharp');
    if (url) {
        var crypto = require('crypto');
        var shasum = crypto.createHash('sha1');
        shasum.update(url);
        var hex = shasum.digest('hex');
        var dirname = require('path').dirname(__dirname) + '/../uploads/picture/' + hex;
        req.html_helper.getImage(url, function (err, data) {
            if (!err) {
                var transformer = sharp();
                transformer.png();
                var r = data.pipe(transformer).pipe(fs.createWriteStream(dirname));
                r.on('close', function (err) {
                    if (!err) {
                        var sizeOf = require('image-size');
                        sizeOf(dirname, function (err, dimensions) {
                            if (err) {
                                next(err);
                            } else {
                                res.json({
                                    error: 0,
                                    data: {
                                        data: hex,
                                        size: dimensions
                                    }
                                });
                            }
                        });
                    } else {
                        next(err);
                    }
                });

            } else {
                next(err);
            }
        });
    } else {
        res.json({
            error: 1,
            message: 'Invalid URL'
        });
    }

});
/** 
 * Method To Make Product Image URL of website internal
 */
router.get('/images/:id', function (req, res, next) {


//    console.log(req.webp);
//    console.log(req.headers);

    console.log('request images');

    var fs = require('fs');
    var website_scrap_data = req.conn_website_scrap_data;
    var id = req.param('id');
    var sharp = require('sharp');
    if (id) {
        var dirname = require('path').dirname(__dirname) + '/../uploads/images/' + id;
        if (fs.existsSync(dirname)) {
            console.log('file exists');

            if (req.webp) {
                var dirname1 = require('path').dirname(__dirname) + '/../uploads/images/' + id + "_webp";

                if (!fs.existsSync(dirname1)) {
                    var steam = fs.createReadStream(dirname);
                    var transformer = sharp();
                    transformer.webp();
                    var r = steam.pipe(transformer).pipe(fs.createWriteStream(dirname1));
                    r.on('error', function () {
                        res.set('Content-Type', 'image/png');
                        var steam = fs.createReadStream(dirname);
                        steam.pipe(res);
                    });
                    r.on('close', function (err) {
                        res.set('Content-Type', 'image/webp');
                        var steam = fs.createReadStream(dirname1);
                        steam.pipe(res);
                    });
                } else {
                    res.set('Content-Type', 'image/webp');
                    var steam = fs.createReadStream(dirname1);
                    steam.pipe(res);
                }
            } else {
                res.set('Content-Type', 'image/png');
                var steam = fs.createReadStream(dirname);
                steam.pipe(res);
            }
        } else {
            res.set('Content-Type', 'image/png');
            website_scrap_data.findOne({
                _id: mongoose.Types.ObjectId(id)
            }, function (err, row) {
                if (row) {
                    var url = row.get('img');
                    var dirname = require('path').dirname(__dirname) + '/../uploads/images/' + id;
                    console.log('dirname ' + dirname);
                    console.log('from url ' + url);
                    req.html_helper.getImage(url, function (err, data) {
                        if (!err) {
                            var transformer = sharp();
                            transformer.png();
                            var dirname = require('path').dirname(__dirname) + '/../uploads/images/' + id;
                            var r = data.pipe(transformer).pipe(fs.createWriteStream(dirname));
                            r.on('error', function (err) {
                                console.log('errror in getting image ' + err);
                                var dirname = require('path').dirname(__dirname) + '/../uploads/empty.png';
                                var steam = fs.createReadStream(dirname);
                                steam.pipe(res);
                            });
                            r.on('close', function (err) {
                                var dirname = require('path').dirname(__dirname) + '/../uploads/images/' + id;
                                if (!err && fs.existsSync(dirname)) {
                                    console.log('dirname ' + dirname);
                                    var steam = fs.createReadStream(dirname);
                                    steam.pipe(res);
                                } else {
                                    var dirname = require('path').dirname(__dirname) + '/../uploads/empty.png';
                                    var steam = fs.createReadStream(dirname);
                                    steam.pipe(res);
                                }
                            });

                        } else {
                            console.log('get html error');
                            var dirname = require('path').dirname(__dirname) + '/../uploads/empty.png';
                            var steam = fs.createReadStream(dirname);
                            steam.pipe(res);
                        }
                    });
                } else {
                    console.log('not found in mongodb')
                    var dirname = require('path').dirname(__dirname) + '/../uploads/empty.png';
                    var steam = fs.createReadStream(dirname);
                    steam.pipe(res);
                }
            });
        }
    }
});

/**
 * View any single file uploaded
 */
router.get('/view/:filename/', function (req, res, next) {
    var filename = req.param('filename');
    var fs = require('fs');
    console.log(filename + ' filename');
    if (filename) {
        var gfs = req.gfs;
        gfs.files.find({filename: filename}).toArray(function (err, files) {

            if (err) {
                next(err);
            }
            if (files.length > 0) {
                console.log(files);
                if (req.webp) {
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
                    if (req.webp) {
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
                    if (req.webp) {
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
                        read_stream.on('error', function () {
                            var dirname = require('path').dirname(__dirname) + '/../uploads/empty.png';
                            var steam = fs.createReadStream(dirname);
                            steam.pipe(res)
                        });

                    }
                } else {
                    var transformer = sharp();
                    if (req.webp) {
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
                        read_stream.on('error', function () {
                            var dirname = require('path').dirname(__dirname) + '/../uploads/empty.png';
                            var steam = fs.createReadStream(dirname);
                            steam.pipe(res)
                        });
                    }
                }
            } else {
                var dirname = require('path').dirname(__dirname) + '/../uploads/picture/';
                var fs_filename = dirname + filename;
                console.log('fff ' + fs_filename);
                if (fs.existsSync(fs_filename)) {
                    var steam = fs.createReadStream(fs_filename);
                    if (req.query.width) {
                        var transformer = sharp().resize(req.query.width * 1);
                        steam.pipe(transformer).pipe(res);
                    } else {
                        steam.pipe(res);
                    }
                } else {
                    var dirname = require('path').dirname(__dirname) + '/../uploads/empty.png';
                    var steam = fs.createReadStream(dirname);
                    steam.pipe(res);
                }
            }
        });
    } else {
        var dirname = require('path').dirname(__dirname) + '/../uploads/empty.png';
        var steam = fs.createReadStream(dirname);
        steam.pipe(res);
    }
});

/*
 * Upload a picture
 */
router.all('/upload', function (req, res, next) {
    var gfs = req.gfs;
    var body = req.body;
    var size = body.size;
    var temp = body.temp;
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

            if (temp) {
                var transformer = sharp();
                transformer.png();

                var fs_filename = require('path').dirname(__dirname) + '/../uploads/picture/' + mongo_filename;
                var writestream = fs.createWriteStream(fs_filename);
                read_stream.pipe(transformer).pipe(writestream);
            } else {
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
            }
            writestream.on('close', function () {

                var dimensions = false;
                if (size) {
                    var sizeOf = require('image-size');
                    dimensions = sizeOf(fs_filename);
                }
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
