var express = require('express');
var router = express.Router();
//console.log('res resr resr');
router.get('/list', function(req, res) {
    res.json(req.catalog);
});
router.get('/products',function(req,res){
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
        m_cat_id = 0;
    }
    if( m_sub_cat_id == '' || m_sub_cat_id == false ){
        m_sub_cat_id=0;
    }
    
    if( cat_id == false ){
        cat_id = 0;
    }
    
    var where = {
        'cat_id':m_cat_id,
        'sub_cat_id':m_sub_cat_id
    };
    
    website_scrap_data.where( where ).skip( skip_count ).limit( products_per_page ).find( query_results );
    function query_results( err, data ){
        res.json(data);
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
//router.get('/list', function(req, res,next) {
    // parameters will be found in body
    //var body =req.body;
    //body.cat_id''
    //res.json('cat subc asdasd age');
//});
module.exports = router;
