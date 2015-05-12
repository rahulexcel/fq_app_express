function stringToArray(str, expby) {
    var ret = new Array();
    if (str) {
        var split = str.split(expby);
        for (i = 0; i < split.length; i++) {
            ss = split[i];
            ss = ss.trim();
            if (ss.length > 0) {
                ret.push(ss);
            }
        }
    }
    return ret;
}
function getRegexString(string) {
    string = fltr_val.replace(/\[/g, '');
    string = fltr_val.replace(/\]/g, '');
    string = new RegExp(string, "i");
    return string;
}

var express = require('express');
var router = express.Router();
router.all('/list', function (req, res) {
    if (req.method === 'OPTIONS') {
        res.json('');
    } else {

        if (typeof req.recycle_data.father_wise_listing_status != 'undefined') {
            var father_wise_listing_status = req.recycle_data.father_wise_listing_status;
            if (father_wise_listing_status == 2) {
                res.json({
                    error: 2,
                    message: req.recycle_data.father_wise_listing_msg
                });
            } else if (father_wise_listing_status == 1) {
                res.json({
                    error: 1,
                    message: req.recycle_data.father_wise_listing_msg
                });
            } else if (father_wise_listing_status == 0) {
                res.json({
                    error: 0,
                    data: req.recycle_data.father_wise_listing
                });
            }
        } else {
            res.json({
                error: 1,
                message: 'check module-recylce_data.js'
            });
        }
    }
});
router.all('/filters', function (req, res, next) {
    if (req.method === 'OPTIONS') {
        res.json('');
    } else {
        var is_search_filter = false;
        var search_text = req.body.search;
        if (typeof search_text != 'undefined' && search_text.length > 0) {
            is_search_filter = true;
        }
        var father_key = req.body.father_key;
        var request_filter_cat_id = req.body.cat_id;
        var request_filter_sub_cat_id = req.body.sub_cat_id;
        var filters_category_wise = req.conn_filters_category_wise;
        var is_cat_id_set = false;
        var is_sub_cat_id_set = false;
        if (typeof request_filter_cat_id != 'undefined' && request_filter_cat_id != -1) {
            is_cat_id_set = true;
        }
        if (typeof request_filter_sub_cat_id != 'undefined' && request_filter_sub_cat_id != -1) {
            is_sub_cat_id_set = true;
        }
        var applied_filters = req.body.filters;
        var is_filter_applied = false;
        if (typeof applied_filters != 'undefined' && applied_filters.length > 0) {
            is_filter_applied = true;
            Object.keys(applied_filters).forEach(function (key) {
                fltr = applied_filters[key].param;
                fltr_str_arr = stringToArray(fltr, '__');
                check = fltr_str_arr[0];
                if (check == 'filter') {
                    fltr_type = fltr_str_arr[1];
                    fltr_key = fltr_str_arr[2];
                    fltr_val = fltr_str_arr[3];
                    if (fltr_type == 'integer') {
                        if (fltr_key == 'cat_id') {
                            request_filter_cat_id = fltr_val;
                            is_cat_id_set = true;
                        }
                        if (fltr_key == 'sub_cat_id') {
                            request_filter_sub_cat_id = fltr_val;
                            is_sub_cat_id_set = true;
                        }
                    }
                }
            });
        }
        var is_father_request = false;
        if (typeof father_key != 'undefined' && father_key != '') {
            is_father_request = true;
        }
        if (!req.body.cat_id && !req.body.sub_cat_id && is_father_request == false && is_filter_applied == false) {
            res.json({
                error: 0,
                data: []
            });
            return;
        } else {
            var finalData = {};
            finalData.filters = {};


            var sortBy_arr = new Array;
            sortBy_arr.push({'text': 'Popular', 'param': 'popular', 'sort': {'sort_score': 1}});
            sortBy_arr.push({'text': 'New Arrivals', 'param': 'new', 'sort': {'is_new_insert': -1, 'time': -1}});
            sortBy_arr.push({'text': 'Price -- Low to High', 'param': 'pricelth', 'sort': {'price': 1}});
            sortBy_arr.push({'text': 'Price -- High to Low', 'param': 'pricehtl', 'sort': {'price': -1}});
            //sortBy_arr.push({'text': 'Off % -- Low to High','param': 'offlth','sort': {'offrate': 1}});
            //sortBy_arr.push({'text': 'Off % -- High to Low','param': 'offhtl','sort': {'offrate': -1}});
            sortBy_arr.push({'text': 'Price Change', 'param': 'pricechange', 'sort': {'price_diff': -1}});
            if (is_search_filter == false) {
                // if search page no need of sort
                finalData.sort = sortBy_arr; //filter
            }
            var father_wise_listing = req.recycle_data.father_wise_listing;
            var category_filters = [];
            if (is_father_request == true && is_filter_applied == false) {
                if (typeof (father_wise_listing) != 'undefined' && father_wise_listing.length > 0) {
                    for (var i = 0; i < father_wise_listing.length; i++) {
                        var chk_father_key = father_wise_listing[i].father_key;
                        if (father_key == chk_father_key && typeof father_wise_listing[i].data != 'undefined' && father_wise_listing[i].data.length > 0) {
                            for (k = 0; k < father_wise_listing[i].data.length; k++) {
                                delete father_wise_listing[i].data[k].data;
                                $p_cat_data = father_wise_listing[i].data[k];
                                $p_cat_data.text = father_wise_listing[i].data[k].name;
                                if (father_wise_listing[i].data[k].sub_cat_id != -1 && father_wise_listing[i].data[k].sub_cat_id != 1) {
                                    // for watches and sunglasses
                                    $p_cat_data.param = 'filter__integer__sub_cat_id__' + father_wise_listing[i].data[k].sub_cat_id;
                                } else {
                                    $p_cat_data.param = 'filter__integer__cat_id__' + father_wise_listing[i].data[k].cat_id;
                                }
                                category_filters.push($p_cat_data);
                            }
                        }
                    }
                }
                finalData.filters.category_filters = {
                    text: 'Category',
                    key: 'category_filter',
                    data: category_filters
                };
                res.json({
                    error: 0,
                    data: finalData,
                });
            }
            else if (is_cat_id_set == true && is_sub_cat_id_set == false && request_filter_sub_cat_id != -1) {
                if (typeof (father_wise_listing) != 'undefined' && father_wise_listing.length > 0) {
                    for (var i = 0; i < father_wise_listing.length; i++) {
                        if (typeof father_wise_listing[i].data != 'undefined' && father_wise_listing[i].data.length > 0) {
                            for (k = 0; k < father_wise_listing[i].data.length; k++) {
                                var chk_cat_id = father_wise_listing[i].data[k].cat_id;
                                if (chk_cat_id == request_filter_cat_id) {
                                    for (j = 0; j < father_wise_listing[i].data[k].data.length; j++) {
                                        $p_cat_data = father_wise_listing[i].data[k].data[j];
                                        $p_cat_data.text = father_wise_listing[i].data[k].data[j].name;
                                        $p_cat_data.param = 'filter__integer__sub_cat_id__' + father_wise_listing[i].data[k].data[j].sub_cat_id;
                                        category_filters.push($p_cat_data);
                                    }
                                }
                            }
                        }
                    }
                }
                finalData.filters.sub_category_filters = {
                    text: 'Sub-Category',
                    key: 'sub_category_filter',
                    data: category_filters
                };
                res.json({
                    error: 0,
                    data: finalData,
                });
            }
            else {
                if (is_cat_id_set == false && is_sub_cat_id_set == true) {
                    var where_filter = {
                        'sub_cat_id': request_filter_sub_cat_id * 1
                    };
                } else {
                    var where_filter = {
                        'cat_id': request_filter_cat_id * 1,
                        'sub_cat_id': request_filter_sub_cat_id * 1
                    };
                }
                filters_category_wise.where(where_filter).find(results);
                function results(err, data) {
                    if (err) {
                        next(err);
                    } else {
                        if (data.length == 0) {
                            res.json({
                                error: 0,
                                data: finalData,
                            });
                            return;
                        } else {
                            raw_filters = data[0].get('filters').api_filters;
                            if (is_search_filter == true) {
                                Object.keys(raw_filters).forEach(function (key) {
                                    if (key == 'brand' || key == 'price') {
                                    } else {
                                        delete raw_filters[key];
                                    }
                                });
                            }
                            finalData.filters = raw_filters;
                            res.json({
                                error: 0,
                                data: finalData,
                            });
                        }
                    }
                }
            }
        }
    }
});
router.all('/products_old', function (req, res, next) {
    var redis = req.redis;
    if (req.method === 'OPTIONS') {
        res.json('');
    } else {
        //req.body.father_key = 'men';
        //req.body.search = 'adidas';

        var is_father_request = false;
        var requested_father_key = '';
        var requested_father_children = [];
        var requested_father_cats = new Array();
        if (typeof req.body.father_key != 'undefined' && req.body.father_key != '') {
            is_father_request = true;
            requested_father_key = req.body.father_key;
        }

        if (!req.body.cat_id && !req.body.sub_cat_id && is_father_request == false) {
            res.json({
                error: 1,
                message: 'Invalid Request'
            });
            return;
        }

        var request_filter_cat_id = req.body.cat_id;
        var request_filter_sub_cat_id = req.body.sub_cat_id;

        if (is_father_request == true) {
            request_filter_cat_id = 0;
            request_filter_sub_cat_id = 0;
            var father_wise_listing = req.recycle_data.father_wise_listing;
            var category_listing = req.recycle_data.category_listing;
            father_wise_listing.forEach(function (val, key) {
                var xx = father_wise_listing[key];
                var xx_father_key = xx.father_key;
                if (requested_father_key == xx_father_key) {
                    requested_father_cats = xx.all_cat_id;
                    requested_father_children = xx.data;
                }
            });
        }

        var productObj = req.productObj;


        //var products_per_page = 20;
        //var product_data_list = 'name website brand price img href offrate'; // add here to get fields in product info
        var search_limit = 30; //products count to be shown while searching
        var products_per_page = req.config.products_per_page;
        var product_data_list = req.config.product_data_list;
        //var body = {
        //'cat_id':30,
        //'sub_cat_id':3001,
        //'father_key':'men',
        //'father_text':'men',
        //'page':1,
        //'filters':[
        //'filter__text__website__snapdeal',
        //'filter__range__price__500_600'
        //]
        //'filters':[
        //{name: 'Name',param: 'filter__text__website__snapdeal'},
        //{name: 'Name',param: 'filter__range__price__500_600'},
        //],
        //'sortby':'pricehtl',
        //};
        //req.body = body;
        //-start sorting---------------------------------------------------------------
        var sortBy_arr = new Array;
        sortBy_arr.push({
            'text': 'Popular',
            'param': 'popular',
            'sort': {'sort_score': 1}
        });
        sortBy_arr.push({
            'text': 'New Arrivals',
            'param': 'new',
            'sort': {'is_new_insert': -1, 'time': -1}
        });
        sortBy_arr.push({
            'text': 'Price -- Low to High',
            'param': 'pricelth',
            'sort': {'price': 1}
        });
        sortBy_arr.push({
            'text': 'Price -- High to Low',
            'param': 'pricehtl',
            'sort': {'price': -1}
        });
        //sortBy_arr.push({
        //'text': 'Off % -- Low to High',
        //'param': 'offlth',
        //'sort': {'offrate': 1}
        //});
        //sortBy_arr.push({
        //'text': 'Off % -- High to Low',
        //'param': 'offhtl',
        //'sort': {'offrate': -1}
        //});
        sortBy_arr.push({
            'text': 'Price Change',
            'param': 'pricechange',
            'sort': {'price_diff': 1}
        });
        //console.log(sortBy_arr);

        /*
         $sortOptions['pricechange'] = array('sort' => array('price_diff' => -1), 'name' => 'Price Change');
         if( sizeof( $premiumBrands) >  0){
         $sortOptions['premium'] = array('sort' => array('is_premium' => -1,'time' => -1), 'name' => 'Premium Brands First');
         }
         if( sizeof( $designerBrands) >  0){
         $sortOptions['designer'] = array('sort' => array('is_designer' => -1,'time'=> -1), 'name' => 'Designer Brands First');
         }
         $sortSelected = 'new';
         if (isset($_REQUEST['sort'])) {
         $sortSelected = $_REQUEST['sort'];
         }
         if (array_key_exists($sortSelected, $sortOptions)) {
         $sortBY = $sortOptions[$sortSelected]['sort'];
         }
         */
        //-end sorting---------------------------------------------------------------
        var finalData = {};
        //finalData.sort = sortBy_arr;
        finalData.results_from = '';
        finalData.sort = {};
        //-------------------------------------------------------------------
        var filters_category_wise = req.conn_filters_category_wise;
        console.log(req.body);
        var where_filter = {
            // 'cat_id': req.body.cat_id * 1,
            //'sub_cat_id': req.body.sub_cat_id * 1,
            'cat_id': request_filter_cat_id * 1,
            'sub_cat_id': request_filter_sub_cat_id * 1
        };
        console.log('----START-----where for filters------------');
        console.log(where_filter);
        console.log('----END-----where for filters------------');

        function getRegexString(string) {
            string = fltr_val.replace(/\[/g, '');
            string = fltr_val.replace(/\]/g, '');
            string = new RegExp(string, "i");
            return string;
        }

        var filters = {};
        filters_category_wise.where(where_filter).find(results);
        function results(err, data) {
            if (err) {
                console.log('sdfsdfsdf');
                next(err);
            } else {
                if (data.length == 0) {
                    res.json({
                        error: 1,
                        message: 'filters not found !!',
                    });
                    return;
                } else {
                    raw_filters = data[0].get('filters').api_filters;
                    filters = raw_filters;

                    var colors_data = filters.color.data; // will be used when color filter is applied
                    var sizes_data = filters.sizes.data; // will be used when color filter is applied

                    var where = {};
                    var params = req.body;
                    var cat_id = params.cat_id;
                    var sub_cat_id = params.sub_cat_id;
                    var father_key = params.father_key;
                    var father_text = params.father_text;
                    var page = params.page;
                    if (typeof page === 'undefined') {
                        page = 1;
                    } else {
                        if (page == -1) {
                            page = 1;
                        }
                    }
                    finalData.current_page = page; // page filters are set here
                    var skip_count = (page - 1) * products_per_page;

                    console.log('page : ' + page);
                    //console.log('per page : ' + products_per_page);
                    //console.log('skip :' + skip_count);
                    var website_scrap_data = req.conn_website_scrap_data;

                    if (typeof cat_id != 'undefined' && is_father_request == false) {
                        where['cat_id'] = cat_id * 1;
                    }
                    if (typeof sub_cat_id != 'undefined' && is_father_request == false) {
                        where['sub_cat_id'] = sub_cat_id * 1;
                    }
                    if (is_father_request == true && requested_father_cats.length > 0) {
                        where['cat_id'] = {
                            '$in': requested_father_cats,
                        }
                    }


                    var color_filter_is_set = false;
                    //-start-process set filters----------
                    var set_empty_colors_filters = false;
                    var applied_filters = params.filters;
                    if (typeof applied_filters != 'undefined' && applied_filters.length > 0) {
                        //console.log('----START --------applied filters--------------');
                        //console.log(applied_filters);
                        //console.log('----ENd-- --------applied filters--------------');
                        Object.keys(applied_filters).forEach(function (key) {
                            fltr = applied_filters[key].param;
                            fltr_str_arr = stringToArray(fltr, '__');
                            check = fltr_str_arr[0];
                            if (check == 'filter') {
                                fltr_type = fltr_str_arr[1];
                                fltr_key = fltr_str_arr[2];
                                fltr_val = fltr_str_arr[3];
                                if (fltr_type == 'text') {
                                    fltr_val = fltr_val.replace(/_/g, ' ');
                                    if (fltr_key == 'brand' || fltr_key == 'website' || fltr_key == 'sizes') {
                                        fltr_key_is_in_where = false;
                                        Object.keys(where).forEach(function (cc) {
                                            if (cc == fltr_key) {
                                                fltr_key_is_in_where = true;
                                            }
                                        });
                                        if (fltr_key_is_in_where == false) {
                                            where[fltr_key] = {
                                                '$in': [],
                                            };
                                        }
                                        if (fltr_key == 'sizes') {
                                            if (typeof sizes_data != 'undefined' && sizes_data.length > 0) {
                                                Object.keys(sizes_data).forEach(function (ss_size) {
                                                    size_detail = sizes_data[ss_size];
                                                    size_detail_text = size_detail.text;
                                                    if (fltr_val == size_detail_text) {
                                                        var size_query_params = size_detail.query_params;
                                                        if (typeof size_query_params != 'undefined' && size_query_params.length > 0) {
                                                            for (var jj = 0; jj < size_query_params.length; jj++) {
                                                                var s_size = size_query_params[jj];
                                                                s_size = new RegExp(s_size, 'i');
                                                                where[fltr_key]['$in'].push(s_size);
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        } else {
                                            fltr_val = new RegExp(fltr_val, 'i');
                                            console.log(fltr_val);
                                            where[fltr_key]['$in'].push(fltr_val);
                                        }
                                    } else if (fltr_key == 'color') {
                                        color_filter_is_set = true;
                                        var query_colors = [];
                                        query_colors.push(fltr_val);

                                        if (typeof fltr_str_arr[3] != 'undefined' && fltr_str_arr[4] == 'subcolor') {
                                            set_empty_colors_filters = true;
                                            console.log(' arun kuma COLORS UNSET HERE');
                                            if (typeof fltr_str_arr[5] != 'undefined') {

                                                var list_sub_colors = fltr_str_arr[5];
                                                list_sub_colors = list_sub_colors.replace(/_/g, ' ');
                                                var arr_sub_colors = stringToArray(list_sub_colors, ',');
                                                for (var i = 0; i < arr_sub_colors.length; i++) {
                                                    var subclr = arr_sub_colors[i];
                                                    query_colors.push(subclr);
                                                }
                                                //console.log(list_sub_colors);
                                                //console.log('arun kumar');
                                                //console.log(arr_sub_colors);
                                            }
                                        } else {

                                            //where[fltr_key] = new RegExp(fltr_val, "i");
                                            Object.keys(colors_data).forEach(function (sscc) {
                                                sscc_data = colors_data[sscc];
                                                sscc_color = sscc_data.color;
                                                sscc_data_secondary_colors = sscc_data.secondary_colors;
                                                if (sscc_color == fltr_val) {
                                                    //console.log('aa :: ' +fltr_key);
                                                    //console.log(fltr_val);
                                                    filters.color.data = sscc_data_secondary_colors;
                                                    console.log(' arun kuma COLORS SET HERE');
                                                    for (var i = 0; i < sscc_data_secondary_colors.length; i++) {
                                                        var row = sscc_data_secondary_colors[i];
                                                        query_colors.push(row.color);
                                                        if (typeof row.sub_colors != 'undefined' && row.sub_colors.length > 0) {
                                                            for (var j = 0; j < row.sub_colors.length; j++) {
                                                                var rowss = row.sub_colors[j];
                                                                query_colors.push(getRegexString(rowss));
                                                            }
                                                        }
                                                    }
                                                }
                                            });

                                        }

                                        console.log('query_colors');
                                        console.log(query_colors);


                                        where[fltr_key] = {
                                            '$in': query_colors
                                        };

                                    }
                                    else {
                                        where[fltr_key] = new RegExp(fltr_val, "i");
                                    }

                                } else if (fltr_type == 'range') {
                                    range_arr = stringToArray(fltr_val, '_');
                                    fltr_val_low = range_arr[0];
                                    fltr_val_high = range_arr[1];
                                    where[fltr_key] = {
                                        '$gte': fltr_val_low * 1,
                                        '$lte': fltr_val_high * 1
                                    };
                                }
                            }
                        });
                    }
                    //-end---process set filters---------
                    //-start--process set sorting
                    var query_sort = {};
                    var param_sort_by = 'popular';
                    if (typeof params.sortby != 'undefined') {
                        param_sort_by = params.sortby;
                    }
                    sortBy_arr.forEach(function (val, key) {
                        if (val.param == param_sort_by) {
                            query_sort = val.sort;
                        }
                    });

                    if (param_sort_by == 'pricechange') {
                        where['price_diff'] = {
                            '$exists': true,
                            '$lt': 0 * 1,
                        };
                    }

                    /*
                     if (param_sort_by == 'popular') {
                     where['sort_score'] = {
                     '$exists': true,
                     '$gt': 0 * 1,
                     };
                     }
                     if (typeof where['price'] == 'undefined') {
                     where['price'] = {
                     '$exists': true,
                     '$gt': 0 * 1,
                     };
                     }
                     */
                    if (set_empty_colors_filters == true) { // coz if secondary color is selected then no need to further show colors filters
                        filters.color.data = [];
                    }
                    if (is_father_request == true) {
                        var father_children = {
                            'text': 'Category',
                            'data': []
                        };
                        requested_father_children.forEach(function (val, key) {
                            val_cats = val.data;
                            val_cats.forEach(function (val1, key1) {
                                var row = {
                                    'text': val1.name,
                                    'cat_id': val1.cat_id,
                                    'sub_cat_id': val1.sub_cat_id,
                                };
                                father_children.data.push(row);
                            });
                        });
                        filters = {}; // filters are empty, coz if father key is set then only category has to be shown in filters
                        filters.category = father_children;
                    }



                    finalData.filters = filters; // page filters are set here
                    //finalData.filters = filters.color.data
                    if (color_filter_is_set == true) {
                        finalData.filters = {};
                        finalData.filters.color = filters.color;
                    } else {
                        finalData.filters = {};
                    }




                    //-end----process set sorting
                    console.log('---START----where for products----------------');
                    console.log(where);
                    console.log('---END------where for products----------------');

                    console.log('---START----sort applied----------------');
                    console.log(query_sort);
                    console.log('---END------sort applied----------------');

                    //redis.flushall();
                    //console.log('flush hua hau');
                    //process.exit(0);
                    //------check for redis data------
                    var start = new Date().getTime();
                    console.log("START TIME :: " + start);
                    console.log('!!! START :: redis check !!!');
                    var where_size = Object.keys(where).length;
                    var check_in_redis = false;
                    if (check_in_redis == true && where_size == 2 && typeof where.cat_id != 'undefined' && where.cat_id != '' && where.sub_cat_id != 'undefined' && where.sub_cat_id != '') {
                        var catlog_redis_key = 'catalog_' + where.cat_id + '_' + where.sub_cat_id;
                        console.log('redis key :: ' + catlog_redis_key);

                        redis.zrevrangebyscore([catlog_redis_key, '+inf', '-inf', 'WITHSCORES', 'LIMIT', skip_count, products_per_page], function (err, response) {
                            if (err) {
                                console.log('444');
                            } else {
                                if (response.length == 0) {
                                    finalData.results_from = 'mongo';
                                    console.log(" -- no data found in redis");
                                    console.log(" -- normal query will run");
                                    website_scrap_data.where(where).sort(query_sort).skip(skip_count).limit(products_per_page).select(product_data_list).find(query_results);
                                    var end = new Date().getTime() - start;
                                    console.log('time taken ' + end);

                                } else {
                                    finalData.results_from = 'redis';
                                    var new_array = [];
                                    var total = 0;
                                    for (var i = 0; i < response.length; i++) {
                                        if (i % 2 === 0) {
                                            new_array.push(response[i]);
                                            total++;
                                        }
                                    }
                                    var end = new Date().getTime() - start;
                                    finalData.products = [];
                                    for (var k = 0; k < total; k++) {
                                        var row_key = new_array[k];
                                        (function (kk, row_key, total) {
                                            row_key = JSON.parse(row_key);
                                            finalData.products.push(productObj.getProductPermit(req, row_key));
                                            if (kk === total - 1) {
                                                var end = new Date().getTime() - start;
                                                console.log('time taken ' + end);
                                                req.toCache = true;
                                                req.cache_data = finalData;
                                                next();
                                            }
                                        })(k, row_key, total);
                                    }

                                    /*
                                     for (var k = 0; k < total; k++) {
                                     var row_key = new_array[k];
                                     (function (kk, row_key, total) {
                                     redis.hgetall('item_' + row_key, function (err, obj) {
                                     if (err) {
                                     console.log('line 463');
                                     console.log(err);
                                     } else {
                                     if (obj) {
                                     var original = obj;
                                     finalData.products.push(productObj.getProductPermit(req, original));
                                     }
                                     }
                                     if (kk === total - 1) {
                                     var end = new Date().getTime() - start;
                                     console.log('time taken ' + end);
                                     req.toCache = true;
                                     req.cache_data = finalData;
                                     next();
                                     }
                                     });
                                     })(k, row_key, total);
                                     }
                                     */
                                }
                            }
                        });
                        console.log('!!! STOP :: redis check !!!');
                        //------check for redis data------
                    } else {
                        finalData.results_from = 'mongo';
                        website_scrap_data.where(where).sort(query_sort).skip(skip_count).limit(products_per_page).select(product_data_list).find(query_results);
                        var end = new Date().getTime() - start;
                        console.log('time taken ' + end);
                    }


                    function query_results(err, data) {
                        if (err) {
                            next(err);
                        } else {
                            finalData.products = [];
                            if (data.length == 0) {
                                res.json({
                                    error: 0,
                                    data: finalData
                                });
                            } else {
                                var modify_data = {};
                                for (var j = 0; j < data.length; j++) {
                                    var row1 = data[j];
                                    var product_price_diff = row1.get('price_diff');
                                    if (typeof product_price_diff != 'undefined') {
                                        row1.set('price_drop', product_price_diff);
                                    } else {
                                        row1.set('price_drop', 0);
                                    }
                                    finalData.products.push(productObj.getProductPermit(req, row1));
                                }
                                var end = new Date().getTime() - start;
                                console.log('time taken ' + end);
                                req.toCache = true;
                                req.cache_data = finalData;
                                next();
                            }
                        }
                    }
                }
            }
        }
    }
    //----------------------------------------------------------------------------
    // --params are available in req.body -- in modules/config.js files

    /*
     
     website_scrap_data.findOne({
     'cat_id':cat_id,
     },function(err,result){
     console.log('query run hui') ;
     console.log(result.length);
     res.json(result.length);
     }).limit(10);
     
     */
    //res.json(req.body);
    //res.json('is products page');
});
router.all('/products', function (req, res, next) {
    var redis = req.redis;
    if (req.method === 'OPTIONS') {
        res.json('');
    } else {
        //req.body.father_key = 'men';
        //req.body.search = 'adidas';
        var productObj = req.productObj;
        var search_limit = 30; //products count to be shown while searching
        var products_per_page = req.config.products_per_page;
        var product_data_list = req.config.product_data_list;
        var filters_category_wise = req.conn_filters_category_wise;
        var website_scrap_data = req.conn_website_scrap_data;
        //********************************************
        var is_father_request = false;
        var requested_father_key = '';
        var requested_father_children = [];
        var requested_father_cats = new Array();
        if (typeof req.body.father_key != 'undefined' && req.body.father_key != '') {
            is_father_request = true;
            requested_father_key = req.body.father_key;
        }
        if (!req.body.cat_id && !req.body.sub_cat_id && is_father_request == false) {
            res.json({
                error: 1,
                message: 'Invalid Request'
            });
            return;
        }
        var where = {};
        var where_filter = {};
        var query_sort = {};
        var filters = {};
        var finalData = {};
        finalData.results_from = '';
        finalData.sort = {};
        var params = req.body;
        var requested_cat_id = params.cat_id;
        var requested_sub_cat_id = params.sub_cat_id;
        var applied_filters = params.filters;
        var requested_father_key = params.father_key;
        var requested_father_text = params.father_text;
        var requested_page = params.page;
        if (typeof requested_page === 'undefined') {
            requested_page = 1;
        } else {
            if (requested_page == -1) {
                requested_page = 1;
            }
        }
        finalData.current_page = requested_page; // page filters are set here
        var skip_count = (requested_page - 1) * products_per_page;
        console.log('page : ' + requested_page);

        if (is_father_request == true) {
            requested_cat_id = 0;
            requested_sub_cat_id = 0;
            var father_wise_listing = req.recycle_data.father_wise_listing;
            var category_listing = req.recycle_data.category_listing;
            father_wise_listing.forEach(function (val, key) {
                var xx = father_wise_listing[key];
                var xx_father_key = xx.father_key;
                if (requested_father_key == xx_father_key) {
                    requested_father_cats = xx.all_cat_id;
                    requested_father_children = xx.data;
                }
            });
        }
        //-start sorting---------------------------------------------------------------
        var sortBy_arr = new Array;
        sortBy_arr.push({'text': 'Popular', 'param': 'popular', 'sort': {'sort_score': 1}});
        sortBy_arr.push({'text': 'New Arrivals', 'param': 'new', 'sort': {'is_new_insert': -1, 'time': -1}});
        sortBy_arr.push({'text': 'Price -- Low to High', 'param': 'pricelth', 'sort': {'price': 1}});
        sortBy_arr.push({'text': 'Price -- High to Low', 'param': 'pricehtl', 'sort': {'price': -1}});
        //sortBy_arr.push({'text': 'Off % -- Low to High','param': 'offlth','sort': {'offrate': 1}});
        //sortBy_arr.push({'text': 'Off % -- High to Low','param': 'offhtl','sort': {'offrate': -1}});
        sortBy_arr.push({'text': 'Price Change', 'param': 'pricechange', 'sort': {'price_diff': 1}});
        /*
         $sortOptions['pricechange'] = array('sort' => array('price_diff' => -1), 'name' => 'Price Change');
         if( sizeof( $premiumBrands) >  0){
         $sortOptions['premium'] = array('sort' => array('is_premium' => -1,'time' => -1), 'name' => 'Premium Brands First');
         }
         if( sizeof( $designerBrands) >  0){
         $sortOptions['designer'] = array('sort' => array('is_designer' => -1,'time'=> -1), 'name' => 'Designer Brands First');
         }
         $sortSelected = 'new';
         if (isset($_REQUEST['sort'])) {
         $sortSelected = $_REQUEST['sort'];
         }
         if (array_key_exists($sortSelected, $sortOptions)) {
         $sortBY = $sortOptions[$sortSelected]['sort'];
         }
         */
        var param_sort_by = 'popular';
        if (typeof params.sortby != 'undefined') {
            param_sort_by = params.sortby;
        }
        sortBy_arr.forEach(function (val, key) {
            if (val.param == param_sort_by) {
                query_sort = val.sort;
            }
        });

        if (param_sort_by == 'pricechange') {
            where['price_diff'] = {
                '$exists': true,
                '$lt': 0 * 1,
            };
        }
        /*
         if (param_sort_by == 'popular') {
         where['sort_score'] = {
         '$exists': true,
         '$gt': 0 * 1,
         };
         }
         if (typeof where['price'] == 'undefined') {
         where['price'] = {
         '$exists': true,
         '$gt': 0 * 1,
         };
         }
         */
        //-end sorting---------------------------------------------------------------

        //-------------------------------------------------------------------
        where_filter = {
            'cat_id': requested_cat_id * 1,
            'sub_cat_id': requested_sub_cat_id * 1
        };
        if (typeof requested_cat_id != 'undefined' && is_father_request == false) {
            where['cat_id'] = requested_cat_id * 1;
        }
        if (typeof requested_sub_cat_id != 'undefined' && is_father_request == false) {
            where['sub_cat_id'] = requested_sub_cat_id * 1;
        }
        if (is_father_request == true && requested_father_cats.length > 0) {
            where['cat_id'] = {'$in': requested_father_cats};
        }
        //---------------------------------------------------------------------------
        filters_category_wise.where(where_filter).find(results);
        function results(err, data) {
            if (err) {
                console.log('sdfsdfsdf');
                next(err);
            } else {
                if (data.length == 0) {
                    finalData.results_from = 'mongo';
                    website_scrap_data.where(where).sort(query_sort).skip(skip_count).limit(products_per_page).select(product_data_list).find(query_results);
                } else {
                    raw_filters = data[0].get('filters').api_filters;
                    filters = raw_filters;
                    var colors_data = filters.color.data; // will be used when color filter is applied
                    var sizes_data = filters.sizes.data; // will be used when size filter is applied
                    var brands_data = filters.brand.data; // will be used when brand filter is applied
                    var color_filter_is_set = false;
                    var set_empty_colors_filters = false;
                    //-start---process set filters---------
                    if (typeof applied_filters != 'undefined' && applied_filters.length > 0) {
                        Object.keys(applied_filters).forEach(function (key) {
                            fltr = applied_filters[key].param;
                            fltr_str_arr = stringToArray(fltr, '__');
                            check = fltr_str_arr[0];
                            if (check == 'filter') {
                                fltr_type = fltr_str_arr[1];
                                fltr_key = fltr_str_arr[2];
                                fltr_val = fltr_str_arr[3];
                                if (fltr_type == 'text') {
                                    fltr_val = fltr_val.replace(/_/g, ' ');
                                    if (fltr_key == 'brand' || fltr_key == 'website' || fltr_key == 'sizes') {
                                        fltr_key_is_in_where = false;
                                        Object.keys(where).forEach(function (cc) {
                                            if (cc == fltr_key) {
                                                fltr_key_is_in_where = true;
                                            }
                                        });
                                        if (fltr_key_is_in_where == false) {
                                            where[fltr_key] = {
                                                '$in': [],
                                            };
                                        }
                                        if (fltr_key == 'sizes') {
                                            if (typeof sizes_data != 'undefined' && sizes_data.length > 0) {
                                                Object.keys(sizes_data).forEach(function (ss_size) {
                                                    size_detail = sizes_data[ss_size];
                                                    size_detail_text = size_detail.text;
                                                    size_detail_text  = size_detail_text.toString();
                                                    if (fltr_val.toLowerCase() == size_detail_text.toLowerCase()) {
                                                        var size_query_params = size_detail.query_params;
                                                        if (typeof size_query_params != 'undefined' && size_query_params.length > 0) {
                                                            for (var jj = 0; jj < size_query_params.length; jj++) {
                                                                var s_size = size_query_params[jj];
                                                                s_size = new RegExp(s_size, 'i');
                                                                where[fltr_key]['$in'].push(s_size);
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        } else if (fltr_key == 'brand') {
                                            if (typeof brands_data != 'undefined' && brands_data.length > 0) {
                                                Object.keys(brands_data).forEach(function (ss_brand) {
                                                    brand_detail = brands_data[ss_brand];
                                                    brand_detail_text = brand_detail.text;
                                                    if (brand_detail_text) {
                                                        brand_detail_text = brand_detail_text + "";
                                                    }
                                                    if (fltr_val.toLowerCase() == brand_detail_text.toLowerCase()) {
                                                        var brand_query_params = brand_detail.query_params;
                                                        if (typeof brand_query_params != 'undefined' && brand_query_params.length > 0) {
                                                            for (var jj = 0; jj < brand_query_params.length; jj++) {
                                                                var s_brand = brand_query_params[jj];
                                                                s_brand = getRegexString(s_brand);
                                                                where[fltr_key]['$in'].push(s_brand);
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        } else {
                                            fltr_val = new RegExp(fltr_val, 'i');
                                            console.log(fltr_val);
                                            where[fltr_key]['$in'].push(fltr_val);
                                        }
                                    } else if (fltr_key == 'color') {
                                        fltr_key_is_in_where = false;
                                        Object.keys(where).forEach(function (cc) {
                                            if (cc == fltr_key) {
                                                fltr_key_is_in_where = true;
                                            }
                                        });
                                        if (fltr_key_is_in_where == false) {
                                            where[fltr_key] = {
                                                '$in': [],
                                            };
                                        }
                                        color_filter_is_set = true;
                                        //var query_colors = [];
                                        //query_colors.push(fltr_val);
                                        // no need for below seconday and sub colors as now colors will work only as main color
                                        /*
                                         if (typeof fltr_str_arr[3] != 'undefined' && fltr_str_arr[4] == 'subcolor') {
                                         set_empty_colors_filters = true;
                                         console.log(' arun kuma COLORS UNSET HERE');
                                         if (typeof fltr_str_arr[5] != 'undefined') {
                                         
                                         var list_sub_colors = fltr_str_arr[5];
                                         list_sub_colors = list_sub_colors.replace(/_/g, ' ');
                                         var arr_sub_colors = stringToArray(list_sub_colors, ',');
                                         for (var i = 0; i < arr_sub_colors.length; i++) {
                                         var subclr = arr_sub_colors[i];
                                         query_colors.push(subclr);
                                         }
                                         //console.log(list_sub_colors);
                                         //console.log('arun kumar');
                                         //console.log(arr_sub_colors);
                                         }
                                         } else {
                                         
                                         //where[fltr_key] = new RegExp(fltr_val, "i");
                                         Object.keys(colors_data).forEach(function(sscc) {
                                         sscc_data = colors_data[sscc];
                                         sscc_color = sscc_data.color;
                                         sscc_data_secondary_colors = sscc_data.secondary_colors;
                                         if (sscc_color == fltr_val) {
                                         //console.log('aa :: ' +fltr_key);
                                         //console.log(fltr_val);
                                         filters.color.data = sscc_data_secondary_colors;
                                         console.log(' arun kuma COLORS SET HERE');
                                         for (var i = 0; i < sscc_data_secondary_colors.length; i++) {
                                         var row = sscc_data_secondary_colors[i];
                                         query_colors.push(row.color);
                                         if (typeof row.sub_colors != 'undefined' && row.sub_colors.length > 0) {
                                         for (var j = 0; j < row.sub_colors.length; j++) {
                                         var rowss = row.sub_colors[j];
                                         query_colors.push(getRegexString(rowss));
                                         }
                                         }
                                         }
                                         }
                                         });
                                         
                                         }
                                         */
                                        console.log('query_colors');
                                        console.log(fltr_val);
                                        //console.log(query_colors);
                                        //where[fltr_key] = {
                                        // '$in': query_colors
                                        //};
                                        where[fltr_key]['$in'].push(getRegexString(fltr_val));
                                    }
                                    else {
                                        where[fltr_key] = new RegExp(fltr_val, "i");
                                    }

                                } else if (fltr_type == 'range') {
                                    range_arr = stringToArray(fltr_val, '_');
                                    fltr_val_low = range_arr[0];
                                    fltr_val_high = range_arr[1];
                                    where[fltr_key] = {
                                        '$gte': fltr_val_low * 1,
                                        '$lte': fltr_val_high * 1
                                    };
                                }
                            }
                        });
                    }
                    //-end---process set filters---------
                    if (set_empty_colors_filters == true) { // coz if secondary color is selected then no need to further show colors filters
                        filters.color.data = [];
                    }
                    if (is_father_request == true) {
                        var father_children = {
                            'text': 'Category',
                            'data': []
                        };
                        requested_father_children.forEach(function (val, key) {
                            val_cats = val.data;
                            val_cats.forEach(function (val1, key1) {
                                var row = {
                                    'text': val1.name,
                                    'cat_id': val1.cat_id,
                                    'sub_cat_id': val1.sub_cat_id,
                                };
                                father_children.data.push(row);
                            });
                        });
                        filters = {}; // filters are empty, coz if father key is set then only category has to be shown in filters
                        filters.category = father_children;
                    }
                    finalData.filters = filters; // page filters are set here
                    //finalData.filters = filters.color.data
                    if (color_filter_is_set == true) {
                        finalData.filters = {};
                        finalData.filters.color = filters.color;
                    } else {
                        finalData.filters = {};
                    }
                    //-end----process set sorting
                    console.log('---START----where for products----------------');
                    console.log(where);
                    console.log('---END------where for products----------------');
                    console.log('---START----sort applied----------------');
                    console.log(query_sort);
                    console.log('---END------sort applied----------------');

                    //redis.flushall();
                    //console.log('flush hua hau');
                    //process.exit(0);
                    //------check for redis data------
                    var start = new Date().getTime();
                    console.log("START TIME :: " + start);
                    console.log('!!! START :: redis check !!!');
                    var where_size = Object.keys(where).length;
                    var check_in_redis = false;
                    if (check_in_redis == true && where_size == 2 && typeof where.cat_id != 'undefined' && where.cat_id != '' && where.sub_cat_id != 'undefined' && where.sub_cat_id != '') {
                        var catlog_redis_key = 'catalog_' + where.cat_id + '_' + where.sub_cat_id;
                        console.log('redis key :: ' + catlog_redis_key);

                        redis.zrevrangebyscore([catlog_redis_key, '+inf', '-inf', 'WITHSCORES', 'LIMIT', skip_count, products_per_page], function (err, response) {
                            if (err) {
                                console.log('444');
                            } else {
                                if (response.length == 0) {
                                    finalData.results_from = 'mongo';
                                    console.log(" -- no data found in redis");
                                    console.log(" -- normal query will run");
                                    website_scrap_data.where(where).sort(query_sort).skip(skip_count).limit(products_per_page).select(product_data_list).find(query_results);
                                    var end = new Date().getTime() - start;
                                    console.log('time taken ' + end);

                                } else {
                                    finalData.results_from = 'redis';
                                    var new_array = [];
                                    var total = 0;
                                    for (var i = 0; i < response.length; i++) {
                                        if (i % 2 === 0) {
                                            new_array.push(response[i]);
                                            total++;
                                        }
                                    }
                                    var end = new Date().getTime() - start;
                                    finalData.products = [];
                                    for (var k = 0; k < total; k++) {
                                        var row_key = new_array[k];
                                        (function (kk, row_key, total) {
                                            row_key = JSON.parse(row_key);
                                            finalData.products.push(productObj.getProductPermit(req, row_key));
                                            if (kk === total - 1) {
                                                var end = new Date().getTime() - start;
                                                console.log('time taken ' + end);
                                                req.toCache = true;
                                                req.cache_data = finalData;
                                                next();
                                            }
                                        })(k, row_key, total);
                                    }

                                    /*
                                     for (var k = 0; k < total; k++) {
                                     var row_key = new_array[k];
                                     (function (kk, row_key, total) {
                                     redis.hgetall('item_' + row_key, function (err, obj) {
                                     if (err) {
                                     console.log('line 463');
                                     console.log(err);
                                     } else {
                                     if (obj) {
                                     var original = obj;
                                     finalData.products.push(productObj.getProductPermit(req, original));
                                     }
                                     }
                                     if (kk === total - 1) {
                                     var end = new Date().getTime() - start;
                                     console.log('time taken ' + end);
                                     req.toCache = true;
                                     req.cache_data = finalData;
                                     next();
                                     }
                                     });
                                     })(k, row_key, total);
                                     }
                                     */
                                }
                            }
                        });
                        console.log('!!! STOP :: redis check !!!');
                        //------check for redis data------
                    } else {
                        finalData.results_from = 'mongo';
                        website_scrap_data.where(where).sort(query_sort).skip(skip_count).limit(products_per_page).select(product_data_list).find(query_results);
                        var end = new Date().getTime() - start;
                        console.log('time taken ' + end);
                    }
                }
            }
        }
        function query_results(err, data) {
            if (err) {
                next(err);
            } else {
                finalData.products = [];
                if (data.length == 0) {
                    res.json({
                        error: 0,
                        data: finalData
                    });
                } else {
                    var modify_data = {};
                    for (var j = 0; j < data.length; j++) {
                        var row1 = data[j];
                        var product_price_diff = row1.get('price_diff');
                        if (typeof product_price_diff != 'undefined') {
                            row1.set('price_drop', product_price_diff);
                        } else {
                            row1.set('price_drop', 0);
                        }
                        finalData.products.push(productObj.getProductPermit(req, row1));
                    }
                    req.toCache = true;
                    req.cache_data = finalData;
                    next();
                }
            }
        }
    }
    //----------------------------------------------------------------------------
    // --params are available in req.body -- in modules/config.js files

    /*
     
     website_scrap_data.findOne({
     'cat_id':cat_id,
     },function(err,result){
     console.log('query run hui') ;
     console.log(result.length);
     res.json(result.length);
     }).limit(10);
     
     */
    //res.json(req.body);
    //res.json('is products page');
});
router.all('/search', function (req, res) {
    var mongoose = req.mongoose;
    var body = req.body;
    var search_text = body.search;
    var father_key = body.father_key;
    var current_page = body.page;
    var products_per_page = req.config.products_per_page;
    if (typeof current_page === 'undefined' || current_page == -1) {
        current_page = 1;
    }
    var skip_count = (current_page - 1) * products_per_page;

    console.log('current_page :: ' + current_page);
    console.log('skip :: ' + skip_count);

    var where = {};

    var is_cat_sub_cat_search = false;
    var search_cat_id = body.cat_id;
    var search_sub_cat_id = body.sub_cat_id;

    //search_cat_id = 30;
    //search_sub_cat_id = 3003;
    var is_cat_id_set = false;
    var is_sub_cat_id_set = false;
    if (typeof search_cat_id != 'undefined' && search_cat_id != -1) {
        where = {
            'cat_id': search_cat_id * 1,
        };
        is_cat_id_set = true;
    }
    if (typeof search_sub_cat_id != 'undefined' && search_sub_cat_id != -1) {
        where = {
            'sub_cat_id': search_sub_cat_id * 1,
        };
        is_sub_cat_id_set = true;
    }

    if (is_cat_id_set == true || is_sub_cat_id_set == true) {
        is_cat_sub_cat_search = true;
    }



    var all_cat_id_found = false;
    var father_wise_listing = req.recycle_data.father_wise_listing;
    if (typeof father_key != 'undefined' && father_key != '' && is_cat_sub_cat_search == false) {
        console.log(father_key + ' :: ');
        if (typeof (father_wise_listing) != 'undefined' && father_wise_listing.length > 0) {
            for (var i = 0; i < father_wise_listing.length; i++) {
                var chk_father_key = father_wise_listing[i].father_key;
                console.log(chk_father_key + ' :: ' + father_key);
                if (father_key == chk_father_key) {
                    console.log('yes found => ' + chk_father_key + ' :: ' + father_key);
                    var father_all_cat_id = father_wise_listing[i].all_cat_id;
                    console.log(father_all_cat_id);
                    if (typeof father_all_cat_id != 'undefined' && father_all_cat_id.length > 0) {
                        all_cat_id_found = true;
                        where = {
                            'cat_id': {
                                '$in': father_wise_listing[i].all_cat_id,
                            }
                        };
                    }
                }
            }
        }
    }

    var applied_filters = body.filters;
    console.log('!!! applied filtere !!!');
    console.log(applied_filters);
    if (typeof applied_filters != 'undefined' && applied_filters.length > 0) {
        Object.keys(applied_filters).forEach(function (key) {
            fltr = applied_filters[key].param;
            console.log(fltr);
            fltr_str_arr = stringToArray(fltr, '__');
            check = fltr_str_arr[0];
            if (check == 'filter') {
                fltr_type = fltr_str_arr[1];
                fltr_key = fltr_str_arr[2];
                fltr_val = fltr_str_arr[3];
                if (fltr_type == 'text') {
                    fltr_val = fltr_val.replace(/_/g, ' ');
                    if (fltr_key == 'brand' || fltr_key == 'website' || fltr_key == 'sizes') {
                        fltr_key_is_in_where = false;
                        Object.keys(where).forEach(function (cc) {
                            if (cc == fltr_key) {
                                fltr_key_is_in_where = true;
                            }
                        });
                        if (fltr_key_is_in_where == false) {
                            where[fltr_key] = {
                                '$in': [],
                            };
                        }
                        if (fltr_key == 'sizes') {
                            if (typeof sizes_data != 'undefined' && sizes_data.length > 0) {
                                Object.keys(sizes_data).forEach(function (ss_size) {
                                    size_detail = sizes_data[ss_size];
                                    size_detail_text = size_detail.text;
                                    if (fltr_val == size_detail_text) {
                                        var size_query_params = size_detail.query_params;
                                        if (typeof size_query_params != 'undefined' && size_query_params.length > 0) {
                                            for (var jj = 0; jj < size_query_params.length; jj++) {
                                                var s_size = size_query_params[jj];
                                                s_size = new RegExp(s_size, 'i');
                                                where[fltr_key]['$in'].push(s_size);
                                            }
                                        }
                                    }
                                });
                            }
                        } else {
                            fltr_val = new RegExp(fltr_val, 'i');
                            console.log(fltr_val);
                            where[fltr_key]['$in'].push(fltr_val);
                        }
                    } else if (fltr_key == 'color') {
                        color_filter_is_set = true;
                        var query_colors = [];
                        query_colors.push(fltr_val);

                        if (typeof fltr_str_arr[3] != 'undefined' && fltr_str_arr[4] == 'subcolor') {
                            set_empty_colors_filters = true;
                            console.log(' arun kuma COLORS UNSET HERE');
                            if (typeof fltr_str_arr[5] != 'undefined') {

                                var list_sub_colors = fltr_str_arr[5];
                                list_sub_colors = list_sub_colors.replace(/_/g, ' ');
                                var arr_sub_colors = stringToArray(list_sub_colors, ',');
                                for (var i = 0; i < arr_sub_colors.length; i++) {
                                    var subclr = arr_sub_colors[i];
                                    query_colors.push(subclr);
                                }
                                //console.log(list_sub_colors);
                                //console.log('arun kumar');
                                //console.log(arr_sub_colors);
                            }
                        } else {

                            //where[fltr_key] = new RegExp(fltr_val, "i");
                            Object.keys(colors_data).forEach(function (sscc) {
                                sscc_data = colors_data[sscc];
                                sscc_color = sscc_data.color;
                                sscc_data_secondary_colors = sscc_data.secondary_colors;
                                if (sscc_color == fltr_val) {
                                    //console.log('aa :: ' +fltr_key);
                                    //console.log(fltr_val);
                                    filters.color.data = sscc_data_secondary_colors;
                                    console.log(' arun kuma COLORS SET HERE');
                                    for (var i = 0; i < sscc_data_secondary_colors.length; i++) {
                                        var row = sscc_data_secondary_colors[i];
                                        query_colors.push(row.color);
                                        if (typeof row.sub_colors != 'undefined' && row.sub_colors.length > 0) {
                                            for (var j = 0; j < row.sub_colors.length; j++) {
                                                var rowss = row.sub_colors[j];
                                                query_colors.push(getRegexString(rowss));
                                            }
                                        }
                                    }
                                }
                            });

                        }

                        console.log('query_colors');
                        console.log(query_colors);


                        where[fltr_key] = {
                            '$in': query_colors
                        };

                    }
                    else {
                        where[fltr_key] = new RegExp(fltr_val, "i");
                    }

                }
                else if (fltr_type == 'range') {
                    range_arr = stringToArray(fltr_val, '_');
                    fltr_val_low = range_arr[0];
                    fltr_val_high = range_arr[1];
                    where[fltr_key] = {
                        '$gte': fltr_val_low * 1,
                        '$lte': fltr_val_high * 1
                    };
                }
                else if (fltr_type == 'integer') {
                    console.log('yahan par hai');
                    console.log(fltr_key);
                    console.log(fltr_val);
                    console.log('**********');
                    where[fltr_key] = fltr_val * 1;
                    console.log(where);
                    console.log('*************');
                }
            }
        });
    }

    console.log(where);
    //search_text = 'adidas';
    var product_data_list = req.config.product_data_list;
    var final_data = new Array();
    var website_scrap_data = req.conn_website_scrap_data;
    var productObj = req.productObj;
    if (typeof search_text === 'undefined' || search_text == '') {
        res.json({
            error: 1,
            message: 'search text is empty'
        });
    } else {
        var search_products = [];
        final_data.text = search_text;
        final_data.result = search_products;
        where['$text'] = {'$search': search_text};
        console.log('!!! where !!!');
        console.log(where);
        /*
        website_scrap_data.find(where, {"score": {"$meta": "textScore"}}, {
            skip: skip_count,
            limit: products_per_page,
            sort: {'score': {'$meta': "textScore"}}
        }, search_results);
        function search_results(err, data) {
            if (err) {
                next(err);
            } else {
                if (typeof data != 'undefined' && data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        var row = data[i];
                        var obj = row;
                        search_products.push(productObj.getProductPermit(req, obj));
                    }
                    final_data.result = search_products;
                    res.json({
                        error: 0,
                        data: {
                            current_page: current_page,
                            products: search_products
                        }
                    });
                } else {
                    res.json({
                        error: 0,
                        data: {}
                    });
                }
            }
        }
        */
       
       website_scrap_data.aggregate(
            {$match: where},
            {$sort: {score: {$meta: "textScore"}}},
            {$skip: skip_count},
            {$limit: products_per_page},
            {$group: {'_id': '$name', 'data': {$push: "$$ROOT"}}},
            //{$project: project_project},
            search_results
        );
        function search_results(err, data) {
            if (err) {
                next(err);
            } else {
                 if (typeof data != 'undefined' && data.length > 0) {
                for (var k = 0; k < data.length; k++) {
                     if (data[k].data && data[k].data.length > 0) {
                         var website_wise = data[k].data;
                         for (var kk = 0; kk < 1; kk++) {
                             var rec = website_wise[kk];
                             if (rec)
                                 search_products.push(productObj.getProductPermit(req, rec));
                         }
                     }
                 }
                 res.json({
                             error: 0,
                             data: {
                                 current_page: current_page,
                                 products: search_products
                             }
                         });
                    }
                    else {
                    res.json({
                        error: 0,
                        data: {}
                    });
                }
                                               // console.log(search_products);
                                                
            }
        }
    }
});
module.exports = router;
