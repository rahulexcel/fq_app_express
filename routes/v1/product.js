var express = require('express');
var router = express.Router();

router.all('/view', function(req,res){
    
    function timeConverter(UNIX_timestamp){
      var a = new Date(UNIX_timestamp);
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var year = a.getFullYear();
      var month = months[a.getMonth()];
      var date = a.getDate();
      var hour = a.getHours();
      var min = a.getMinutes();
      var sec = a.getSeconds();
      var time = date + '-' + month ;
      return time;
    }
    function modifyPriceHistoryForJson( data ){
        var return_data = [];
        for( var i = 0 ; i < data.length ;i++ ){
            var rr = data[i];
            var rr_time = rr['timestamp'];
            rr['date'] = timeConverter(rr_time);
            return_data.push(rr);
        }
        return return_data;
    }
    
    if( req.method === 'OPTIONS'){
        res.json('');
    }else{
    var mongoose = req.mongoose;
    var body = req.body;
    var product_id = body.product_id;
    //var product_id = '54aeaa0a0cc060726433aeae'; for testing
    var category = req.conn_category;
    var website_scrap_data = req.conn_website_scrap_data;
    if( typeof product_id === 'undefined'){
        res.json({
            error:1,
            message:'product_id is not found',
        });
    }else{
        var similar_arr = [];
        var variant_arr = [];
        var price_history_data = [];
        var product_data = {
            product:{},
            similar:similar_arr,
            variant:variant_arr,
            price_history:price_history_data,
            price_drop:0,
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
                if( data == null || data.length == 0  ){
                    res.json({
                        error:1,
                        message:'product not found for product_id '+product_id,
                    });
                }else{
                    product_name = data.get('name');
                    product_website = data.get('website');
                    product_cat_id = data.get('cat_id');
                    product_sub_cat_id = data.get('sub_cat_id');
                    product_price_diff = data.get('price_diff');
                    if( typeof product_price_diff != 'undefined'){
                        product_data.price_drop = product_price_diff;
                    }
                    product_price_history = data.get('price_history');
                    if( typeof product_price_history != 'undefined' && product_price_history.length > 0 ){
                        product_data.price_history = modifyPriceHistoryForJson(product_price_history);
                    }
                    
                    where_category ={
                        'cat_id':product_cat_id*1,
                        'sub_cat_id':product_sub_cat_id*1,
                    };
                    category.where( where_category ).findOne( cat_info );
                    function cat_info( err, catData){
                        if( err ){
                            res.json({
                                error:2,
                                message:err.err,
                            });
                        }else {
                            data.set('cat_name','');
                            data.set('parent_cat_name','');
                            if( Object.keys(catData).length > 0 ){
                                data.set('cat_name',catData.get('name'));
                                data.set('parent_cat_name',catData.get('parent_cat_name'));
                            }
                            product_data.product = data;
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
    }
    }
});
module.exports = router;
