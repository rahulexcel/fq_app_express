var express = require('express');
var router = express.Router();
router.all('/list', function (req, res) {
    var category = req.conn_category;
    var website_scrap_data = req.conn_website_scrap_data;
    category.find({
        'is_fashion':1
    },function(err,data){
        if( err ){
            res.json({
                error:2,
                message:err.err,
            });
        }else{
            if( data.length == 0 ){
                res.json({
                    error:1,
                    message:'empty raw category listing',
                });
            }else{
                cat_list = data;
                var catalog = {};
                var father_wise_listing = new Array();
                var catalog_cats = new Array();
                Object.keys(cat_list).forEach(function(key){
                    var x = cat_list[key];
                    cat_id = x.get('cat_id');
                    sub_cat_id = x.get('sub_cat_id');
                    cat_name = x.get('name');
                    parent_cat_id = x.get('cat_id');
                    parent_cat_name = x.get('parent_cat_name');
                    single_cat_id = x.get('single_cat_id');
                    father_key = x.get('father_key');
                    father_text = x.get('father_text');
                    
                    father_exists = false;
                    father_wise_listing.forEach(function(val,key){
                        if( val.father_key == father_key ){
                            father_exists = true;
                        }
                    });
                    if( father_exists == false ){
                        generateFather = {};
                        generateFather['name'] = father_text;
                        generateFather['cat_id'] = -1;
                        generateFather['sub_cat_id'] = -1;
                        generateFather['father_key'] = father_key;
                        generateFather['father_text'] = father_text;
                        generateFather['data'] = new Array();;
                        father_wise_listing.push(generateFather);
                    }else{
                        father_wise_listing.forEach(function(val,key){
                            if( val.father_key == father_key ){
                                parent_exists = false;
                                parent_wise = val.data;
                                parent_wise.forEach(function(val1,key1){
                                    if(val1.cat_id == cat_id){
                                        parent_exists = true;
                                    }
                                });
                                if( parent_exists == false ){
                                    generateParent = {};
                                    generateParent['name'] = parent_cat_name;
                                    generateParent['cat_id'] = cat_id;
                                    generateParent['sub_cat_id'] = -1;
                                    generateParent['data'] = new Array();
                                    parent_wise.push(generateParent);
                                }
                                if( sub_cat_id != -1 ){
                                    parent_wise.forEach(function(val2,key2){
                                        if( val2.cat_id == cat_id){
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
                res.json({
                    error:0,
                    data:father_wise_listing
                });
            }
        }
    });
});
router.all('/products', function (req, res) {
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
    var products_per_page = 20;
    var product_data_list = 'name website price';
    var body = {
        'cat_id':30,
        'sub_cat_id':3001,
        'father_key':'men',
        'father_text':'men',
        'page':1,
        'filters':[
            'filter__text__website__snapdeal',
            'filter__range__price__500_600'
        ]
    };
    req.body = body;
    
    var finalData = {};
    //-------------------------------------------------------------------
    var filters_category_wise = req.conn_filters_category_wise;
    var where_filter = {
        'cat_id': req.body.cat_id,
        'sub_cat_id': req.body.sub_cat_id,
    };
    var filters = {};
    filters_category_wise.where(where_filter).find(results);
    function results(err, data) {
        if( err ){
            res.json({
                error:2,
                message:err.err,
            });
        }else{
            if( data.length == 0 ){
                res.json({
                    error:1,
                    message:'filters not found !!',
                });
            }else{
                raw_filters = data[0].get('filters').api_filters;
                filters = raw_filters;
                finalData.filters = filters; // page filters are set here
                
                var where = {};
                var params = req.body;
                var cat_id = params.cat_id;
                var sub_cat_id = params.sub_cat_id;
                var father_key = params.father_key;
                var father_text = params.father_text;
                var page = params.page;
                var skip_count = (page - 1) * products_per_page;
                console.log('page : ' + page);
                console.log('per page : ' + products_per_page);
                console.log('skip :' + skip_count);
                var website_scrap_data = req.conn_website_scrap_data;
                var m_cat_id = cat_id;
                var m_sub_cat_id = sub_cat_id;
                if (m_cat_id == '' || m_cat_id == false) {
                    //m_cat_id = 0;
                    where['cat_id'] = m_cat_id;
                }
                if (m_sub_cat_id == '' || m_sub_cat_id == false) {
                    //m_sub_cat_id=0;
                    where['sub_cat_id'] = m_sub_cat_id;
                }
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
                if ( applied_filters.length > 0 ) {
                    console.log('applied filters');
                    console.log(applied_filters);
                    console.log('--------');
                    Object.keys(applied_filters).forEach(function (key) {
                        fltr = applied_filters[key];
                        fltr_str_arr = stringToArray(fltr, '__');
                        check = fltr_str_arr[0];
                        if (check == 'filter') {
                            fltr_type = fltr_str_arr[1];
                            fltr_key = fltr_str_arr[2];
                            fltr_val = fltr_str_arr[3];
                            if (fltr_type == 'text') {
                                fltr_val = fltr_val.replace(/_/g, ' ');
                                where[fltr_key] = new RegExp(fltr_val, "i");
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
                console.log('where');
                console.log(where);
                console.log('--------');
                website_scrap_data.where(where).skip(skip_count).limit(products_per_page).select( product_data_list ).find(query_results);
                function query_results(err, data) {
                    if( err ){
                        res.json({
                            error:2,
                            message:err.err
                        });
                    }else{
                        if( data.length == 0){
                            res.json({
                                error:1,
                                message:'no product found'
                            });
                        }else{
                            var modify_data = {};
                            finalData.products = data;
                            res.json({
                                error:0,
                                data:finalData,
                            });
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
router.all('/quickview/:mid', function (req, res) {
    var mid = req.param('mid'); // product mongo id
    res.json(mid);
});
//router.get('/list', function(req, res,next) {
// parameters will be found in body
//var body =req.body;
//body.cat_id''
//res.json('cat subc asdasd age');
//});
module.exports = router;
