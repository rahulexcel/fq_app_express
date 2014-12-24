var express = require('express');
var router = express.Router();
//console.log('res resr resr');
router.get('/list', function(req, res) {
    res.json(req.catalog);
});
router.get('/products',function(req,res){
    var where = {};
    var finalData  = {
        'filters':req.filters_to_show,
    };
    // --params are available in req.body -- in modules/config.js files
    var products_per_page = req.config.products_per_page;
    var params = req.body;
    var cat_id = params.cat_id;
    var sub_cat_id = params.sub_cat_id;
    var father_key = params.father_key;
    var father_text = params.father_text;
    var page = params.page;
    var skip_count = (page - 1) * products_per_page;
    console.log('page : '+ page);
    console.log('per page : '+ products_per_page);
    console.log('skip :' + skip_count);
    var website_scrap_data = req.conn_website_scrap_data;
    
    var m_cat_id = cat_id;
    var m_sub_cat_id = sub_cat_id;
    if( m_cat_id == '' || m_cat_id == false ){
        //m_cat_id = 0;
        where['cat_id'] = m_cat_id;
    }
    if( m_sub_cat_id == '' || m_sub_cat_id == false ){
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
    var applied_filters = params.filters;
    if( applied_filters.length > 0){
        console.log('applied filters');
        console.log(applied_filters);
        console.log('--------');
        Object.keys(applied_filters).forEach(function(key){
            fltr = applied_filters[key];
            fltr_str_arr = stringToArray( fltr, '__');
            check = fltr_str_arr[0];
            if( check == 'filter' ){
                fltr_type = fltr_str_arr[1];
                fltr_key = fltr_str_arr[2];
                fltr_val = fltr_str_arr[3];
                if( fltr_type == 'text'){
                    fltr_val = fltr_val.replace(/_/g, ' ');
                    where[fltr_key] = new RegExp(fltr_val, "i");
                }else if(  fltr_type == 'range'){
                    range_arr = stringToArray( fltr_val ,'_');
                    fltr_val_low = range_arr[0];
                    fltr_val_high = range_arr[1];
                    where[fltr_key] = {
                        '$gte':fltr_val_low*1,
                        '$lte':fltr_val_high*1
                    };
                }
            }
        });
    }
    //-end---process set filters---------
    console.log('where');
    console.log(where);
    console.log('--------');
    
    
     website_scrap_data.where( where ).skip( skip_count ).limit( products_per_page ).find( query_results );
    function query_results( err, data ){
        finalData.products = data;
        res.json(finalData);
    }
    
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
router.get('/quickview/:mid',function(req,res){
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
