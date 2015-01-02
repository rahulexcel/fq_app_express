var express = require('express');
var router = express.Router();
router.all('/list', function (req, res) {
    if (req.method === 'OPTIONS') {
        res.json('');
    } else {
        var category = req.conn_category;
        var website_scrap_data = req.conn_website_scrap_data;
        category.find({
            'is_fashion': 1
        }, function (err, data) {
            if (err) {
                res.json({
                    error: 2,
                    message: err.err,
                });
            } else {
                if (data.length == 0) {
                    res.json({
                        error: 1,
                        message: 'empty raw category listing',
                    });
                } else {
                    cat_list = data;
                    var catalog = {};
                    var father_wise_listing = new Array();
                    var catalog_cats = new Array();
                    Object.keys(cat_list).forEach(function (key) {
                        var x = cat_list[key];
                        cat_id = x.get('cat_id');
                        sub_cat_id = x.get('sub_cat_id');
                        cat_name = x.get('name');
                        parent_cat_id = x.get('cat_id');
                        parent_cat_name = x.get('parent_cat_name');
                        single_cat_id = x.get('single_cat_id');
                        father_key = x.get('father_key');
                        father_text = x.get('father_text');
                        father_order = x.get('father_order');

                        father_exists = false;
                        father_wise_listing.forEach(function (val, key) {
                            if (val.father_key == father_key) {
                                father_exists = true;
                            }
                        });
                        if (father_exists == false) {
                            generateFather = {};
                            generateFather['name'] = father_text;
                            generateFather['cat_id'] = -1;
                            generateFather['sub_cat_id'] = -1;
                            generateFather['father_key'] = father_key;
                            generateFather['father_text'] = father_text;
                            generateFather['father_order'] = father_order;
                            generateFather['data'] = new Array();
                            father_wise_listing.push(generateFather);
                        } else {
                            father_wise_listing.forEach(function (val, key) {
                                if (val.father_key == father_key) {
                                    parent_exists = false;
                                    parent_wise = val.data;
                                    parent_wise.forEach(function (val1, key1) {
                                        if (val1.cat_id == cat_id) {
                                            parent_exists = true;
                                        }
                                    });
                                    if (parent_exists == false) {
                                        generateParent = {};
                                        generateParent['name'] = parent_cat_name;
                                        generateParent['cat_id'] = cat_id;
                                        generateParent['sub_cat_id'] = -1;
                                        generateParent['data'] = new Array();
                                        parent_wise.push(generateParent);
                                    }
                                    if (sub_cat_id != -1) {
                                        parent_wise.forEach(function (val2, key2) {
                                            if (val2.cat_id == cat_id) {
                                                generateSubCat = {};
                                                generateSubCat['name'] = cat_name;
                                                generateSubCat['cat_id'] = cat_id;
                                                generateSubCat['sub_cat_id'] = sub_cat_id;
                                                parent_wise[key2]['sub_cat_id'] = 1;
                                                parent_wise[key2]['data'].push(generateSubCat);
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    });
                    if( father_wise_listing.length > 0 ){
                        father_wise_listing.sort(function (a, b) {
                            if( a.father_order > b.father_order){
                                return 1;
                            }else{
                                return 0;
                            }
                        });
                    }
                    res.json({
                        error: 0,
                        data: father_wise_listing
                    });
                }
            }

        });
    }
});
router.all('/products', function (req, res) {

    if (req.method === 'OPTIONS') {
        res.json('');
    } else {

        if (!req.body.cat_id && !req.body_sub_cat_id) {
            res.json({
                error: 1,
                message: 'Invalid Request'
            });
            return;
        }

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
        sortBy_arr.push({
            'text': 'Off % -- Low to High',
            'param': 'offlth',
            'sort': {'offrate': 1}
        });
        sortBy_arr.push({
            'text': 'Off % -- High to Low',
            'param': 'offhtl',
            'sort': {'offrate': -1}
        });
        sortBy_arr.push({
            'text': 'Price Change',
            'param': 'pricechange',
            'sort': {'price_diff': -1}
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
        finalData.sort = sortBy_arr;
        //-------------------------------------------------------------------
        var filters_category_wise = req.conn_filters_category_wise;
        console.log(req.body);
        var where_filter = {
            'cat_id': req.body.cat_id * 1,
            'sub_cat_id': req.body.sub_cat_id * 1,
        };
        console.log('----START-----where for filters------------');
        console.log(where_filter);
        console.log('----END-----where for filters------------');
        var filters = {};
        filters_category_wise.where(where_filter).find(results);
        function results(err, data) {
            if (err) {
                res.json({
                    error: 2,
                    message: err.err,
                });
            } else {
                if (data.length == 0) {
                    res.json({
                        error: 1,
                        message: 'filters not found !!',
                    });
                } else {
                    raw_filters = data[0].get('filters').api_filters;
                    filters = raw_filters;
                    
                    var colors_data = filters.color.data; // will be used when color filter is applied

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
                    var m_cat_id = cat_id;
                    var m_sub_cat_id = sub_cat_id;

                    if (typeof cat_id != 'undefined') {
                        where['cat_id'] = cat_id * 1;
                    }
                    if (typeof sub_cat_id != 'undefined') {
                        where['sub_cat_id'] = sub_cat_id * 1;
                    }

//                if (m_cat_id == '' || m_cat_id == false) {
                    //m_cat_id = 0;
                    //where['cat_id'] = m_cat_id;
                    //}
                    //if (m_sub_cat_id == '' || m_sub_cat_id == false) {
                    //m_sub_cat_id=0;
                    //where['sub_cat_id'] = m_sub_cat_id;
                    //}
                    //if( cat_id == false ){
                    //cat_id = 0;
                    // }

                    //if( cat_id != false ){
                    //where['cat_id'] = m_cat_id;
                    //}

                    //var where = {
                    //'cat_id':m_cat_id,
                    //'sub_cat_id':m_sub_cat_id
                    //};
                    //-start-process set filters----------
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
                                if (fltr_type == 'text' ) {
                                    fltr_val = fltr_val.replace(/_/g, ' ');
                                    if( fltr_key == 'brand' || fltr_key == 'website' ){
                                        fltr_key_is_in_where = false;
                                        Object.keys( where ).forEach(function(cc){
                                            if( cc == fltr_key ){
                                                fltr_key_is_in_where = true;
                                            }
                                        });
                                        if( fltr_key_is_in_where == false ){
                                            where[fltr_key] = {
                                                    '$in':[],
                                            };
                                        }
                                        where[fltr_key]['$in'].push(fltr_val);
                                        
                                        //Object.keys(where).
                                    }else if( fltr_key == 'color'){
                                        var query_colors = [];
                                        query_colors.push( fltr_val );
                                        
                                        if( typeof fltr_str_arr[3] != 'undefined' && fltr_str_arr[4] == 'subcolor' && typeof fltr_str_arr[5] != 'undefined'){
                                            var list_sub_colors = fltr_str_arr[5];
                                            list_sub_colors = list_sub_colors.replace(/_/g, ' ');
                                            var arr_sub_colors = stringToArray(list_sub_colors, ',');
                                            for( var i=0;i<arr_sub_colors.length;i++){
                                                var subclr = arr_sub_colors[i];
                                                console.log('arun --- '+subclr);
                                                query_colors.push(subclr);
                                            }
                                            
                                            console.log(list_sub_colors);
                                            console.log('arun kumar');
                                            console.log(arr_sub_colors);
                                        }else{
                                        
                                            //where[fltr_key] = new RegExp(fltr_val, "i");
                                            Object.keys( colors_data ).forEach(function(sscc){
                                                sscc_data = colors_data[sscc];
                                                sscc_color = sscc_data.color;
                                                sscc_data_secondary_colors = sscc_data.secondary_colors;
                                                if(sscc_color == fltr_val){
                                                    console.log('aa :: ' +fltr_key);
                                                    console.log(fltr_val);
                                                    filters.color.data = sscc_data_secondary_colors;
                                                    for( var i=0;i<sscc_data_secondary_colors.length;i++){
                                                        var row = sscc_data_secondary_colors[i];
                                                        query_colors.push(row.color);
                                                        if( typeof row.sub_colors != 'undefined' && row.sub_colors.length > 0 ) {
                                                            for( var j=0;j<row.sub_colors.length;j++){
                                                                var rowss = row.sub_colors[j];
                                                                query_colors.push(rowss);
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                            
                                        }
                                        
                                        console.log('query_colors');
                                        console.log(query_colors);
                                        
                                        
                                        where[fltr_key] = {
                                            '$in':query_colors
                                        };
                                        
                                    }else{
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
                    if (typeof params.sortby != 'undefined') {
                        sortBy_arr.forEach(function (val, key) {
                            if (val.param == params.sortby) {
                                query_sort = val.sort;
                            }
                        });
                    }
                    
                    finalData.filters = filters; // page filters are set here
                    
                    //-end----process set sorting
                    console.log('---START----where for products----------------');
                    console.log(where);
                    console.log('---END------where for products----------------');
                    
                    console.log('---START----sort applied----------------');
                    console.log(query_sort);
                    console.log('---END------sort applied----------------');
                    
                    var is_text_search = false;
                    if( typeof req.body.search != 'undefined' && req.body.search != ''){
                        is_text_search = true;
                    }
                    if( is_text_search == true ){
                        console.log('text search ::: ' + req.body.search);
                        finalData.current_page = -1; // coz only one page will be shown during search
                        website_scrap_data.db.db.command({
                            text: 'website_scrap_data', 
                            search: req.body.search,
                            filter:where,
                            limit: search_limit
                        },query_results);
                    }else{
                        website_scrap_data.where(where).sort(query_sort).skip(skip_count).limit(products_per_page).select(product_data_list).find(query_results);
                    }
                    
                    function query_results(err, data) {
                        if (err) {
                            res.json({
                                error: 2,
                                message: err.err
                            });
                        } else {
                            finalData.products = [];
                            if (data.length == 0) {
                                res.json({
                                    error: 0,
                                    data: finalData
                                });
                            } else {
                                var modify_data = {};
                                if( is_text_search == false ){
                                    finalData.products = data;
                                }else{
                                    if( data.results ){
                                        for(var i=0;i<data.results.length;i++){
                                            var row = data.results[i];
                                            var obj = row.obj
                                            finalData.products.push(obj);
                                        }
                                    }
                                }
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
router.all('/search',function(req,res){
    var mongoose = req.mongoose;
    var body = req.body;
    var search_text = body.text;
    //search_text = 'adidas';
    var product_data_list = req.config.product_data_list;
    var final_data = new Array();
    var website_scrap_data = req.conn_website_scrap_data;
    if( typeof search_text === 'undefined' || search_text == ''){
        res.json({
            error:1,
            message:'search text is empty'
        });
    }else{
        var search_products = [];
        final_data.text = search_text;
        final_data.result = search_products;
        website_scrap_data.db.db.command({
            text: 'website_scrap_data', 
            search: search_text,
            limit: 20, 
            select:product_data_list,
            //filter : where_similar
        },function(err,data){
            if( err ){
                res.json({
                    error:2,
                    message:err.err
                });
            }else{
                if( data.results ){
                    for(var i=0;i<data.results.length;i++){
                        var row = data.results[i];
                        var obj = row.obj
                        search_products.push(obj);
                    }
                    final_data.result = search_products;
                    res.json({
                        error:0,
                        data:search_products
                    });
                }else{
                    res.json({
                        error:1,
                        data:'error in data.results'
                    });
                }
            }        
        });
    }
});
module.exports = router;
