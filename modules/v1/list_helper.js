var mongoose = require('mongoose');

module.exports = function () {

    var list_helper = {};

    list_helper.getWishlistItemSize = function (img, req, done) {
        var crypto = require('crypto');
        var fs = require('fs');
        var sharp = require('sharp');
        var md5 = crypto.createHash('md5');
        var dirname = require('path').dirname(__dirname) + '/../uploads/picture/';
        md5.update(img);
        var fs_filename = md5.digest('hex');
        var gfs = req.gfs;
        gfs.files.find({
            filename: fs_filename
        }).toArray(function (err, rows) {
            if (rows.length > 0 && rows[0]._id && fs.existsSync(dirname + fs_filename)) {
                console.log('image already exists');

                var sizeOf = require('image-size');
                sizeOf(dirname + fs_filename, function (err, dimensions) {
                    if (err) {
                        done(err);
                    } else {
                        done(false, {
                            filename: fs_filename,
                            size: dimensions
                        });
                    }
                });

            } else {
                req.html_helper.getImage(img, function (err, data) {
                    if (!err) {
                        try {
                            var transformer = sharp();
                            transformer.png();
                            var r = data.pipe(transformer).pipe(fs.createWriteStream(dirname + fs_filename));
                            r.on('error', function (err) {
                                console.log('error in image 23');
                                console.log(err);
                                done(err);
                            });
                            r.on('close', function (err) {
                                if (err) {
                                    console.log('error in image 28');
                                    done(err);
                                } else {
                                    var read_stream = fs.createReadStream(dirname + fs_filename);
                                    var writestream = gfs.createWriteStream({
                                        filename: fs_filename
                                    });
                                    writestream.on('error', function (err) {
                                        done(err);
                                    })
                                    read_stream.on('error', function (err) {
                                        done(err);
                                    })
                                    read_stream.pipe(writestream);
                                    writestream.on('close', function () {
                                        console.log(dirname + fs_filename);
                                        var sizeOf = require('image-size');
                                        sizeOf(dirname + fs_filename, function (err, dimensions) {
                                            if (err) {
                                                done(err);
                                            } else {
                                                done(false, {
                                                    filename: fs_filename,
                                                    size: dimensions
                                                });
                                            }
                                        });
                                    });
                                }
                            });
                        } catch (e) {
                            console.log('exception at');
                            done(e);
                        }
                    } else {
                        done(err);
                    }
                }, 5000);
            }
        });

    };
    list_helper.getListDetail = function (list_id, req, done) {
        if (list_id * 1 === -1) {
            done(null, {
                name: 'FashionIQ'
            });
            return;
        }
        var Wishlist = req.Wishlist;
        Wishlist.findOne({
            _id: mongoose.Types.ObjectId(list_id)
        }).lean().exec(function (err, row) {
            if (err) {
                done(err);
            } else {
                done(null, row);
            }
        });

    };
    return function (req, res, next) {
        req.list_helper = list_helper;
        next();
    };
}