var express = require('express');
var router = express.Router();

router.all('/view', function(req,res){
    if( req.method === 'OPTIONS'){
        
    }else{
    var mongoose = req.mongoose;
    var body = req.body;
    var product_id = body.product_id;
    //var product_id = '5447e7dc6124ea8f0bff3cba';
    var website_scrap_data = req.conn_website_scrap_data;
    if( typeof product_id === 'undefined'){
        res.json({
            error:1,
            message:'product_id is not found',
        });
    }else{
        var similar_arr = [];
        var variant_arr = [];
        var product_data = {
            product:{},
            similar:similar_arr,
            variant:variant_arr,
        };
        var where = {
            '_id' : mongoose.Types.ObjectId(product_id),
        };
        //var scrap_db3 = req.scrap_db3;
        var product_data_list = req.config.product_data_list;
        website_scrap_data.where(where).select(product_data_list).findOne( result );
        function result( err, data ){
            if( err ){
                res.json({
                    error:2,
                    message:err.err,
                });
            }else{
                if( data.length == 0 ){
                    res.json({
                        error:1,
                        message:'product not found for product_id '+product_id,
                    });
                }else{
                    product_data.product = data;
                    product_name = data.get('name');
                    product_website = data.get('website');
                    product_cat_id = data.get('cat_id');
                    product_sub_cat_id = data.get('sub_cat_id');
                    //--------------------------------------------------
                    where_similar = {
                        'cat_id':product_cat_id*1,
                        'sub_cat_id':product_sub_cat_id*1,
                        'website':product_website,
                    };
                    where_variant = {
                        'cat_id':product_cat_id*1,
                        'sub_cat_id':product_sub_cat_id*1,
                        'website':{'$ne':product_website},
                    };
                    
                    website_scrap_data.db.db.command({
                        text: 'website_scrap_data', 
                        search: product_name,
                        limit: 10, 
                        filter : where_similar
                    },function(err,data_sim){
                        if( err ){
                            res.json({
                                error:2,
                                message:err.err,
                            });
                        }else{
                            if(data_sim.results){
                                for(var i=0;i<data_sim.results.length;i++){
                                    var row = data_sim.results[i];
                                    var obj = row.obj
                                    similar_arr.push(obj);
                                }
                                product_data.similar = similar_arr;
                            }
                            website_scrap_data.db.db.command({
                                text: 'website_scrap_data', 
                                search: product_name,
                                limit: 10, 
                                filter : where_variant
                            },function(err,data_var){
                                if( err ){
                                    res.json({
                                        error:2,
                                        message:err.err,
                                    });
                                }else{
                                    if(data_var.results){
                                        for(var i=0;i<data_var.results.length;i++){
                                            var row = data_var.results[i];
                                            var obj = row.obj
                                            variant_arr.push(obj);
                                        }
                                        product_data.variant = variant_arr;
                                    }
                                    res.json({
                                        error:0,
                                        data:product_data
                                    });
                                }
                            });
                        }
                    });
                }
            }
            
        }
    }
    }
});
module.exports = router;
