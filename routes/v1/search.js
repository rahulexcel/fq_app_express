var express = require('express');
var router = express.Router();

router.all('/',function(req,res){
    var mongoose = req.mongoose;
    var body = req.body;
    var search_text = body.text;
    search_text = 'adidas';
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
