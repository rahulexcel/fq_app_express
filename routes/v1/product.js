var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

function stringToArray(str, expby) {
    var ret = new Array();
    var split = str.split(expby);
    for (i = 0; i < split.length; i++) {
        ss = split[i];
        ss = ss.trim();
        if (ss.length > 0) {
            ret.push(ss);
        }
    }
    return ret;
}
function arrayToString(arr, impby) {
    return arr.join(impby);
}
function timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + '-' + month;
    return time;
}
function modifyPriceHistoryForJson(data) {
    var return_data = [];
    for (var i = 0; i < data.length; i++) {
        var rr = data[i];
        var rr_time = rr['timestamp'];
        rr['date'] = timeConverter(rr_time);
        return_data.push(rr);
    }
    return return_data;
}
function manipulateVariantData(data) {
    var per_website = 4;
    var ret_data = [];
    var websites_wise = {};
    if (typeof data != 'undefined' && data.length > 0) {
        for (var i = 0; i < data.length; i++) {
            var web_exists = false;
            var row = data[i];
            var website = row.get('website');
            Object.keys(websites_wise).forEach(function (cc) {
                if (cc == website) {
                    web_exists = true;
                }
            });
            if (web_exists == false) {
                websites_wise[website] = 0;
            }
            if (websites_wise[website] < per_website) {
                ret_data.push(row);
            }
            websites_wise[website] += 1;
        }
    }
    if (ret_data.length > 0) {
        ret_data.sort(function (a, b) {
            return a.sort_score - b.sort_score;
        });
    }

    return ret_data;
}



router.all('/view', function (req, res, next) {
    if (req.method === 'OPTIONS') {
        res.json('');
    } else {
        var body = req.body;
        var productObj = req.productObj;
        var product_id = body.product_id;
        //var product_id = '551984740155684e3e97880a'; //for testing
        var category = req.conn_category;
        var website_scrap_data = req.conn_website_scrap_data;
        if (typeof product_id === 'undefined') {
            res.json({
                error: 1,
                message: 'product_id is not found',
            });
        } else {
            var similar_arr = [];
            var variant_arr = [];
            var price_history_data = [];
            var product_data = {
                product: {},
                similar: similar_arr,
                variant: variant_arr,
                //price_history:price_history_data,
                //price_drop:0,
                //brand_filter_key:'',
            };
            var where = {
                '_id': mongoose.Types.ObjectId(product_id),
            };
            var product_data_list = req.config.product_data_list;
            website_scrap_data.where(where).select(product_data_list).findOne(result);
            function result(err, data) {
                if (err) {
                    next(err);
                } else {
                    if (data == null || data.length == 0) {
                        res.json({
                            error: 1,
                            message: 'product not found for product_id ' + product_id,
                        });
                    } else {
                        var is_model_no_product = false;
                        product_name = data.get('name');
                        product_website = data.get('website');
                        product_cat_id = data.get('cat_id');
                        product_sub_cat_id = data.get('sub_cat_id');
                        product_brand = data.get('brand');
                        product_model_no = '';

                        if (typeof data.get('model_no') != 'undefined' && data.get('model_no') != '') {
                            product_model_no = data.get('model_no');
                            is_model_no_product = true;
                            console.log(' product_model_no found :: ' + product_model_no);
                        }
                        data.set('brand_filter_key', '');
                        data.set('website_filter_key', '');
                        data.set('price_drop', 0);
                        data.set('price_history_new', []);


                        if (typeof product_brand != 'undefined' && product_brand != '') {
                            var brand1 = stringToArray(product_brand, ' ');
                            var brand2 = arrayToString(brand1, '_');
                            //product_data.brand_filter_key = 'filter__text__brand__'+brand2;
                            data.set('brand_filter_key', 'filter__text__brand__' + brand2);
                        }
                        if (typeof product_website != 'undefined' && product_website != '') {
                            var website1 = stringToArray(product_website, ' ');
                            var website2 = arrayToString(website1, '_');
                            data.set('website_filter_key', 'filter__text__website__' + website2);
                        }
                        product_price_diff = data.get('price_diff');
                        if (typeof product_price_diff != 'undefined') {
                            //product_data.price_drop = product_price_diff;
                            data.set('price_drop', product_price_diff);
                        }
                        product_price_history = data.get('price_history');
                        if (typeof product_price_history != 'undefined' && product_price_history != null && product_price_history.length > 0) {
                            //product_data.price_history = modifyPriceHistoryForJson(product_price_history);
                            data.set('price_history_new', modifyPriceHistoryForJson(product_price_history));
                        }

                        where_category = {
                            'cat_id': product_cat_id * 1,
                            'sub_cat_id': product_sub_cat_id * 1,
                        };
                        category.where(where_category).findOne(cat_info);
                        function cat_info(err, catData) {
                            if (err) {
                                next(err);
                            } else {
                                data.set('cat_name', '');
                                data.set('parent_cat_name', '');
                                if (Object.keys(catData).length > 0) {
                                    data.set('cat_name', catData.get('name'));
                                    data.set('parent_cat_name', catData.get('parent_cat_name'));
                                }
                                product_data.product = productObj.getProductPermit(req, data);
                                req.toCache = true;
                                req.cache_data = product_data;
                                next();
                            }
                        }
                    }
                }
            }
        }
    }
});
router.all('/similar', function (req, res, next) {
    var body = req.body;
    var product_id = body.product_id;
    var unique = body.unique;
    var website = body.website;
    var productObj = req.productObj;
    //var product_id = '54f5b06c06bd9c9c40fe5458'; //for testing
    var category = req.conn_category;
    var website_scrap_data = req.conn_website_scrap_data;
    if (typeof product_id === 'undefined' && typeof unique === 'undefined') {
        res.json({
            error: 1,
            message: 'Invalid Request',
        });
    } else {
        var similar_arr = [];
        if (product_id) {
            var where = {
                '_id': mongoose.Types.ObjectId(product_id)
            };
        } else {
            var where = {
                'unique': unique,
                website: website
            };
        }
        var product_data_list = req.config.product_data_list;
        website_scrap_data.where(where).select(product_data_list).findOne(result);
        function result(err, data) {
            if (err) {
                next(err);
            } else {
                if (data == null || data.length == 0) {
                    res.json({
                        error: 0,
                        data: [],
                        message: 'product not found for product_id ' + product_id,
                    });
                } else {
                    var is_model_no_product = false;
                    product_name = data.get('name');
                    product_website = data.get('website');
                    product_cat_id = data.get('cat_id');
                    product_sub_cat_id = data.get('sub_cat_id');
                    product_brand = data.get('brand');
                    product_model_no = '';
                    if (typeof data.get('model_no') != 'undefined' && data.get('model_no') != '') {
                        product_model_no = data.get('model_no');
                        is_model_no_product = true;
                        console.log(' product_model_no found :: ' + product_model_no);
                    }
                    //--------------------------------------------------
                    if (product_name) {
                        var split_name = product_name.split(' ');
                        var split_brand = product_brand.split(' ');
                        if (split_brand.length > 1) {
                            //three words

                            product_name = split_name.slice(0, 3).join(" ");

                        } else {
                            //two words
                            product_name = split_name.slice(0, 2).join(" ");
                        }
                    }
                    var where_2 = {};
                    if (product_id) {
                        where_similar = {
                            '_id': {
                                '$nin': [
                                    mongoose.Types.ObjectId(product_id),
                                ]
                            },
                            'cat_id': product_cat_id * 1,
                            'sub_cat_id': product_sub_cat_id * 1,
                            'website': product_website,
                            '$text': {'$search': product_name},
                        };
                        where_2 = {
                            '_id': {
                                '$nin': [
                                    mongoose.Types.ObjectId(product_id),
                                ]
                            },
                            'cat_id': product_cat_id * 1,
                            'sub_cat_id': product_sub_cat_id * 1,
                            'website': product_website,
                            'brand': product_brand
                        };
                    } else {
                        where_similar = {
                            'unique': {
                                '$nin': [
                                    unique
                                ]
                            },
                            'cat_id': product_cat_id * 1,
                            'sub_cat_id': product_sub_cat_id * 1,
                            'website': product_website,
                            '$text': {'$search': product_name},
                        };
                        where_2 = {
                            'unique': {
                                '$nin': [
                                    unique
                                ]
                            },
                            'cat_id': product_cat_id * 1,
                            'sub_cat_id': product_sub_cat_id * 1,
                            'website': product_website,
                            'brand': product_brand
                        };
                    }


                    if (typeof product_brand != 'undefined' && product_brand != '') {
                        where_similar['brand'] = new RegExp(product_brand, "i");
                    }
                    console.log('!! where_similar !!!');
                    console.log(where_similar);
                    website_scrap_data.find(where_similar, {"score": {"$meta": "textScore"}}, {
                        limit: 10,
                        sort: {'score': {'$meta': "textScore"}},
                        select: product_data_list,
                    }, function (err, data) {
                        if (err) {
                            next(err);
                        } else {
                            if (data.length > 0) {
                                console.log('data found similar');
                                data_sim_res(err, data)
                            } else {
                                console.log('data not found in first similar search');
                                website_scrap_data.find(where_2, {
                                    limit: 10,
                                    select: product_data_list,
                                }).exec(data_sim_res);

                            }
                        }
                    });
                    function data_sim_res(err, data_sim) {
                        if (err) {
                            next(err);
                        } else {
                            if (data_sim) {
                                for (var i = 0; i < data_sim.length; i++) {
                                    var row = data_sim[i];
                                    var obj = row;
                                    similar_arr.push(productObj.getProductPermit(req, obj));
                                }
                            }
//                            res.json({
//                                error: 0,
//                                data: similar_arr,
//                            });
                            req.toCache = true;
                            req.cache_data = similar_arr;
                            req.cache_time = 60 * 60 * 24;
                            next();
                        }
                    }
                }
            }
        }
    }
});
router.all('/variant', function (req, res, next) {
    var body = req.body;
    var product_id = body.product_id;
    var productObj = req.productObj;
    //var product_id = '552cac783df12f4d5d08e00f'; //for testing
    var category = req.conn_category;
    var website_scrap_data = req.conn_website_scrap_data;
    if (typeof product_id === 'undefined') {
        res.json({
            error: 1,
            message: 'product_id is not found',
        });
    } else {
        var variant_arr = [];
        var where = {
            '_id': mongoose.Types.ObjectId(product_id),
        };
        var product_data_list = req.config.product_data_list;
        website_scrap_data.where(where).select(product_data_list).findOne(result);
        function result(err, data) {
            if (err) {
                next(err);
            } else {
                if (data == null || data.length == 0) {
                    res.json({
                        error: 1,
                        message: 'product not found for product_id ' + product_id,
                    });
                } else {
                    var is_model_no_product = false;
                    product_name = data.get('name');
                    product_website = data.get('website');
                    product_cat_id = data.get('cat_id');
                    product_sub_cat_id = data.get('sub_cat_id');
                    product_brand = data.get('brand');
                    product_model_no = '';
                    if (typeof data.get('model_no') != 'undefined' && data.get('model_no') != '') {
                        product_model_no = data.get('model_no');
                        is_model_no_product = true;
                        console.log(' product_model_no found :: ' + product_model_no);
                    }
                    //--------------------------------------------------

                    if (product_name) {
                        var split_name = product_name.split(' ');
                        var split_brand = product_brand.split(' ');
                        if (split_brand.length > 1) {
                            //three words

                            product_name = split_name.slice(0, 3).join(" ");

                        } else {
                            //two words
                            product_name = split_name.slice(0, 2).join(" ");
                        }
                    }
                    where_variant = {
                        '_id': {
                            '$nin': [
                                mongoose.Types.ObjectId(product_id),
                            ]
                        },
                        'cat_id': product_cat_id * 1,
                        'sub_cat_id': product_sub_cat_id * 1,
                        'website': {'$ne': product_website},
                        '$text': {'$search': product_name},
                    };
                    if (typeof product_brand != 'undefined' && product_brand != '') {
                        where_variant['brand'] = new RegExp(product_brand, "i");
                    }
                    if (is_model_no_product == true) {
                        where_variant['model_no'] = new RegExp(product_model_no, "i");
                    }
                    console.log('!! where_variant !!!');
                    console.log(where_variant);
                    website_scrap_data.find(where_variant, {"score": {"$meta": "textScore"}}, {
                        limit: 500,
                        sort: {'score': {'$meta': "textScore"}},
                        select: product_data_list,
                    }, data_var_res);
                    function data_var_res(err, data_var) {
                        if (err) {
                            next(err);
                        } else {
                            if (typeof data_var != 'undefined' && data_var.length > 0) {
                                for (var i = 0; i < data_var.length; i++) {
                                    var row = data_var[i];
                                    var obj = row;
                                    variant_arr.push(productObj.getProductPermit(req, obj));
                                }
                                res.json({
                                    error: 0,
                                    data: manipulateVariantData(variant_arr),
                                });
                            } else if (is_model_no_product == true) {
                                console.log('!!model -- will check without model no!!!');
                                delete where_variant.model_no;
                                console.log(where_variant);
                                website_scrap_data.find(where_variant, {"score": {"$meta": "textScore"}}, {
                                    limit: 500,
                                    sort: {'score': {'$meta': "textScore"}},
                                    select: product_data_list,
                                }, data_var_res2);
                                function data_var_res2(err, data_var2) {
                                    if (err) {
                                        next(err);
                                    } else {
                                        if (typeof data_var2 != 'undefined' && data_var2.length > 0) {
                                            for (var i = 0; i < data_var2.length; i++) {
                                                var row = data_var2[i];
                                                var obj = row;
                                                variant_arr.push(productObj.getProductPermit(req, obj));
                                            }
                                            res.json({
                                                error: 0,
                                                data: manipulateVariantData(variant_arr),
                                            });
                                        } else {
                                            res.json({
                                                error: 0,
                                                data: variant_arr,
                                            });
                                        }
                                    }
                                }
                            } else {
//                                res.json({
//                                    error: 0,
//                                    data: variant_arr,
//                                });
                                req.toCache = true;
                                req.cache_data = variant_arr;
                                req.cache_time = 60 * 60 * 24;
                                next();
                            }
                        }
                    }
                }
            }
        }
    }
});




router.all('/variant_old', function (req, res, next) {
    if (req.method === 'OPTIONS') {
        res.json('');
    } else {
        var body = req.body;
        var product_id = body.product_id;
        //var product_id = '54f9635f489382cc47db2684'; //for testing
        var productObj = req.productObj;
        var category = req.conn_category;
        var website_scrap_data = req.conn_website_scrap_data;
        if (typeof product_id === 'undefined') {
            res.json({
                error: 1,
                message: 'product_id is not found',
            });
        } else {
            var project_project = {
                //'cat_id' : '$data.cat_id',
                //'sub_cat_id' : '$_id.sub_cat_id',
                //'name' : '$_id.name',
                //'website':'$_id.website',
                //'brand':'$_id.brand',
                //'price':'$_id.price',
                //'img':'$_id.img',
                //'href':'$_id.href',
                //'offrate':'$_id.offrate',
                //'price_history':'$_id.price_history',
                //'price_diff':'$_id.price_diff',
                //'sort_score':'$_id.sort_score',
                //'model_no':'$_id.model_no',
                //'cat_id sub_cat_id name website brand price img href offrate price_history price_diff sort_score model_no'
            };

            var variant_arr = [];
            var where = {
                '_id': mongoose.Types.ObjectId(product_id),
            };
            var product_data_list = req.config.product_data_list;
            website_scrap_data.where(where).select(product_data_list).findOne(result);
            function result(err, data) {
                if (err) {
                    next(err);
                } else {
                    if (data == null || data.length == 0) {
                        res.json({
                            error: 1,
                            message: 'product not found for product_id ' + product_id,
                        });
                    } else {
                        var is_model_no_product = false;
                        product_name = data.get('name');
                        product_website = data.get('website');
                        product_cat_id = data.get('cat_id');
                        product_sub_cat_id = data.get('sub_cat_id');
                        product_brand = data.get('brand');
                        product_model_no = '';
                        if (typeof data.get('model_no') != 'undefined' && data.get('model_no') != '') {
                            product_model_no = data.get('model_no');
                            is_model_no_product = true;
                            console.log(' product_model_no found :: ' + product_model_no);
                        }
                        where_variant = {
                            '_id': {
                                '$nin': [
                                    mongoose.Types.ObjectId(product_id),
                                ]
                            },
                            'cat_id': product_cat_id * 1,
                            'sub_cat_id': product_sub_cat_id * 1,
                            'website': {'$ne': product_website},
                            '$text': {'$search': product_name},
                        };
                        if (typeof product_brand != 'undefined' && product_brand != '') {
                            where_variant['brand'] = new RegExp(product_brand, "i");
                        }
                        if (is_model_no_product == true) {
                            where_variant['model_no'] = new RegExp(product_model_no, "i");
                            console.log('varient where');
                            console.log(where_variant);
                        }
                        console.log(' !!! where_variant !!! ');
                        console.log(where_variant);
                        website_scrap_data.aggregate(
                                {$match: where_variant},
                        {$sort: {score: {$meta: "textScore"}}},
                        //{$limit: 1000},
                        {$group: {'_id': '$website', 'data': {$push: "$$ROOT"}}},
                        //{$project: project_project},
                        data_var_res
                                );
                        function data_var_res(err, data_var) {
                            if (err) {
                                next(err);
                            } else {
                                //console.log(data_var);
                                if (typeof data_var != 'undefined' && data_var.length > 0) {
                                    for (var k = 0; k < data_var.length; k++) {
                                        if (data_var[k].data && data_var[k].data.length > 0) {
                                            var website_wise = data_var[k].data;
                                            for (var kk = 0; kk < 4; kk++) {
                                                var rec = website_wise[kk];
                                                if (rec) {
                                                    variant_arr.push(productObj.getProductPermit(req, rec));
                                                }
                                            }
                                            if (variant_arr.length > 0) {
                                                variant_arr.sort(function (a, b) {
                                                    return a.sort_score - b.sort_score;
                                                });
                                            }
                                        }
                                    }
                                    res.json({
                                        error: 0,
                                        data: variant_arr,
                                    });
                                }
                                else if (is_model_no_product == true) {
                                    //start---this will execute if products found with model is NULL
                                    if (is_model_no_product == true) {
                                        console.log('!!model -- will check without model no!!!');
                                        delete where_variant.model_no;
                                        console.log(where_variant);
                                        website_scrap_data.aggregate(
                                                {$match: where_variant},
                                        {$sort: {score: {$meta: "textScore"}}},
                                        //{$limit: 1000},
                                        {$group: {'_id': '$website', 'data': {$push: "$$ROOT"}}},
                                        //{$project: project_project},
                                        data_var_res2
                                                );
                                        function data_var_res2(err, data_var2) {

                                            if (err) {
                                                next(err);
                                            } else {
                                                //console.log(data_var2);
                                                for (var k = 0; k < data_var2.length; k++) {
                                                    if (data_var2[k].data && data_var2[k].data.length > 0) {
                                                        var website_wise = data_var2[k].data;
                                                        for (var kk = 0; kk < 4; kk++) {
                                                            var rec = website_wise[kk];
                                                            if (rec)
                                                                variant_arr.push(productObj.getProductPermit(req, rec));
                                                        }
                                                        if (variant_arr.length > 0) {
                                                            variant_arr.sort(function (a, b) {
                                                                return a.sort_score - b.sort_score;
                                                            });
                                                        }
                                                    }
                                                }
                                                res.json({
                                                    error: 0,
                                                    data: variant_arr,
                                                });
                                            }
                                        }
                                    }
                                    //end---this will execute if products found with model is NULL
                                }
                                else {
                                    res.json({
                                        error: 0,
                                        data: variant_arr,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});
router.all('/view_old', function (req, res, next) {
    if (req.method === 'OPTIONS') {
        res.json('');
    } else {
        var body = req.body;
        var product_id = body.product_id;

        var productObj = req.productObj;

        //var product_id = '54aeaa0a0cc060726433aeae'; for testing
        var category = req.conn_category;
        var website_scrap_data = req.conn_website_scrap_data;
        if (typeof product_id === 'undefined') {
            res.json({
                error: 1,
                message: 'product_id is not found',
            });
        } else {
            var similar_arr = [];
            var variant_arr = [];
            var price_history_data = [];
            var product_data = {
                product: {},
                similar: similar_arr,
                variant: variant_arr,
                //price_history:price_history_data,
                //price_drop:0,
                //brand_filter_key:'',
            };
            var where = {
                '_id': mongoose.Types.ObjectId(product_id),
            };
            //var scrap_db3 = req.scrap_db3;
            var product_data_list = req.config.product_data_list;
            website_scrap_data.where(where).select(product_data_list).findOne(result);
            function result(err, data) {
                if (err) {
                    res.json({
                        error: 2,
                        message: err.err,
                    });
                } else {
                    if (data == null || data.length == 0) {
                        res.json({
                            error: 1,
                            message: 'product not found for product_id ' + product_id,
                        });
                    } else {
                        var is_model_no_product = false;
                        product_name = data.get('name');
                        product_website = data.get('website');
                        product_cat_id = data.get('cat_id');
                        product_sub_cat_id = data.get('sub_cat_id');
                        product_brand = data.get('brand');
                        product_model_no = '';

                        if (typeof data.get('model_no') != 'undefined' && data.get('model_no') != '') {
                            product_model_no = data.get('model_no');
                            is_model_no_product = true;
                            console.log(' product_model_no found :: ' + product_model_no);
                        }
                        data.set('brand_filter_key', '');
                        data.set('website_filter_key', '');
                        data.set('price_drop', 0);
                        data.set('price_history_new', []);


                        if (typeof product_brand != 'undefined' && product_brand != '') {
                            var brand1 = stringToArray(product_brand, ' ');
                            var brand2 = arrayToString(brand1, '_');
                            //product_data.brand_filter_key = 'filter__text__brand__'+brand2;
                            data.set('brand_filter_key', 'filter__text__brand__' + brand2);
                        }
                        if (typeof product_website != 'undefined' && product_website != '') {
                            var website1 = stringToArray(product_website, ' ');
                            var website2 = arrayToString(website1, '_');
                            data.set('website_filter_key', 'filter__text__website__' + website2);
                        }
                        product_price_diff = data.get('price_diff');
                        if (typeof product_price_diff != 'undefined') {
                            //product_data.price_drop = product_price_diff;
                            data.set('price_drop', product_price_diff);
                        }
                        product_price_history = data.get('price_history');
                        if (typeof product_price_history != 'undefined' && product_price_history != null && product_price_history.length > 0) {
                            //product_data.price_history = modifyPriceHistoryForJson(product_price_history);
                            data.set('price_history_new', modifyPriceHistoryForJson(product_price_history));
                        }

                        where_category = {
                            'cat_id': product_cat_id * 1,
                            'sub_cat_id': product_sub_cat_id * 1,
                        };
                        category.where(where_category).findOne(cat_info);
                        function cat_info(err, catData) {
                            if (err) {
                                res.json({
                                    error: 2,
                                    message: err.err,
                                });
                            } else {
                                data.set('cat_name', '');
                                data.set('parent_cat_name', '');
                                if (Object.keys(catData).length > 0) {
                                    data.set('cat_name', catData.get('name'));
                                    data.set('parent_cat_name', catData.get('parent_cat_name'));
                                }
                                product_data.product = productObj.getProductPermit(req, data);
                                //--------------------------------------------------
                                where_similar = {
                                    '_id': {
                                        '$nin': [
                                            mongoose.Types.ObjectId(product_id),
                                        ]
                                    },
                                    'cat_id': product_cat_id * 1,
                                    'sub_cat_id': product_sub_cat_id * 1,
                                    'website': product_website,
                                    '$text': {'$search': product_name},
                                };
                                where_variant = {
                                    '_id': {
                                        '$nin': [
                                            mongoose.Types.ObjectId(product_id),
                                        ]
                                    },
                                    'cat_id': product_cat_id * 1,
                                    'sub_cat_id': product_sub_cat_id * 1,
                                    'website': {'$ne': product_website},
                                    '$text': {'$search': product_name},
                                };

                                if (typeof product_brand != 'undefined' && product_brand != '') {
                                    where_similar['brand'] = new RegExp(product_brand, "i");
                                    where_variant['brand'] = new RegExp(product_brand, "i");
                                }

                                if (is_model_no_product == true) {
                                    where_variant['model_no'] = new RegExp(product_model_no, "i");
                                    console.log('varient where');
                                    console.log(where_variant);
                                }
                                console.log('!! where_similar !!!');
                                console.log(where_similar);
                                website_scrap_data.find(where_similar, {"score": {"$meta": "textScore"}}, {limit: 10, sort: {'score': {'$meta': "textScore"}}}, data_sim_res);
                                function data_sim_res(err, data_sim) {
                                    if (err) {
                                        res.json({
                                            error: 2,
                                            message: err.err,
                                        });
                                    } else {
                                        if (data_sim) {
                                            for (var i = 0; i < data_sim.length; i++) {
                                                var row = data_sim[i];
                                                var obj = row;
                                                similar_arr.push(productObj.getProductPermit(req, obj));
                                            }
                                            product_data.similar = similar_arr;
                                        }
                                        console.log(' !!! where_variant !!! ');
                                        console.log(where_variant);
                                        website_scrap_data.find(where_variant, {"score": {"$meta": "textScore"}}, {limit: 10, sort: {'score': {'$meta': "textScore"}}}, data_var_res);
                                        function data_var_res(err, data_var) {
                                            if (err) {
                                                res.json({
                                                    error: 2,
                                                    message: err.err,
                                                });
                                            } else {
                                                if (data_var) {
                                                    for (var i = 0; i < data_var.length; i++) {
                                                        var row = data_var[i];
                                                        var obj = row;
                                                        variant_arr.push(productObj.getProductPermit(req, obj));
                                                    }

                                                }
                                                product_data.variant = variant_arr;
                                                req.toCache = true;
                                                req.cache_data = product_data;
                                                next();
                                            }
                                        }
                                        /*
                                         website_scrap_data.aggregate(
                                         {$match: where_variant},
                                         {$sort: {score: {$meta: "textScore"}}},
                                         {$limit: 100},
                                         {$group: {'_id': '$website', 'data': {$push: "$$ROOT"}}},
                                         data_var_res
                                         );
                                         function data_var_res(err, data_var) {
                                         //console.log(data_var);
                                         if (err) {
                                         res.json({
                                         error: 2,
                                         message: err.err,
                                         });
                                         } else {
                                         if (typeof data_var != 'undefined' && data_var.length > 0) {
                                         for (var k = 0; k < data_var.length; k++) {
                                         if (data_var[k].data && data_var[k].data.length > 0) {
                                         var website_wise = data_var[k].data;
                                         for (var kk = 0; kk < 2; kk++) {
                                         var rec = website_wise[kk];
                                         if (rec)
                                         variant_arr.push(productObj.getProductPermit(req, rec));
                                         }
                                         if (variant_arr.length > 0) {
                                         variant_arr.sort(function (a, b) {
                                         return a.sort_score - b.sort_score;
                                         });
                                         }
                                         }
                                         }
                                         product_data.variant = variant_arr;
                                         req.toCache = true;
                                         req.cache_data = product_data;
                                         next();
                                         } else if (is_model_no_product == true) {
                                         //start---this will execute if products found with model is NULL
                                         if (is_model_no_product == true) {
                                         console.log('!!model -- will check without model no!!!');
                                         delete where_variant.model_no;
                                         console.log(where_variant);
                                         website_scrap_data.aggregate(
                                         {$match: where_variant},
                                         {$sort: {score: {$meta: "textScore"}}},
                                         {$limit: 100},
                                         {$group: {'_id': '$website', 'data': {$push: "$$ROOT"}}},
                                         data_var_res2
                                         );
                                         function data_var_res2(err, data_var2) {
                                         if (err) {
                                         res.json({
                                         error: 2,
                                         message: err.err,
                                         });
                                         } else {
                                         for (var k = 0; k < data_var2.length; k++) {
                                         if (data_var2[k].data && data_var2[k].data.length > 0) {
                                         var website_wise = data_var2[k].data;
                                         for (var kk = 0; kk < 2; kk++) {
                                         var rec = website_wise[kk];
                                         if (rec)
                                         variant_arr.push(productObj.getProductPermit(req, rec));
                                         }
                                         if (variant_arr.length > 0) {
                                         variant_arr.sort(function (a, b) {
                                         return a.sort_score - b.sort_score;
                                         });
                                         }
                                         }
                                         }
                                         product_data.variant = variant_arr;
                                         req.toCache = true;
                                         req.cache_data = product_data;
                                         next();
                                         }
                                         }
                                         }
                                         //end---this will execute if products found with model is NULL
                                         } else {
                                         req.toCache = true;
                                         req.cache_data = product_data;
                                         next();
                                         }
                                         }
                                         }
                                         */
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});

module.exports = router;
