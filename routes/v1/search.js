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

router.all('/view', function(req,res){
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
                    
                    
                    /*
                    
                    var mongoose = require('mongoose');
                    //var textSearch = require('mongoose-text-search');
                    var textSearch = require('mongoose-search-plugin');
                    var conn = mongoose.createConnection('mongodb://127.0.0.1/scrap_db3');
                    
                    var gameSchema = mongoose.Schema({
                            sub_cat_name: String
                    },{
                            strict:false,
                            collection:'filters_category_wise',
                    });
                    // give our schema text search capabilities
                    gameSchema.plugin(textSearch,{fields: ['sub_cat_name']});
                    // add a text index to the tags array
                    gameSchema.index({ sub_cat_name: 'text' });
                    // test it out
                    var Game = conn.model('filters_category_wise', gameSchema);
                    console.log('aaaaa');
                    var options = {
                         limit: 10
                    };
                    Game.search('Belts',{},options,function (err, output) {
                        console.log('bbbb');
                        //if (err) return handleError(err);
                        //var inspect = require('util').inspect;
                        //console.log(inspect(output, { depth: null }));
                        if( err ){
                            console.log('error aayi hai');
                            res.json(err);
                            //res.json(err.err);
                        }else{
                            console.log('arun kumar');
                            //var inspect = require('util').inspect;
                            //res.json(inspect(output, { depth: null }));
                            res.json(output);
                        }
                    });
 */
                    
                    
                    //var mongoose = require('mongoose');
                    //var conn = mongoose.createConnection('mongodb://127.0.0.1/scrap_db3');
                    /*
                    conn.connection().find(
                            {'$text':{'search':'shirt'}},
                            {'score' :{'$meta':"textScore"}}
                    ).exec(function (err,arun){
                        if( err ){
                            res.json(err);
                            console.log('error aayi hai');
                            //res.json(err.err);
                        }else{
                            console.log('arun kumar');
                            res.json(arun);
                        }
                        
                    });
                    */
                  
                 /*
                    //var mongoose = require('mongoose');
                    //var conn = mongoose.createConnection('mongodb://127.0.0.1/scrap_db3');
                    var scrap_db3 = mongoose.connection();
                    var command_similar = {
                        'search':product_name,
                        'filter':where_similar,
                    };
                    console.log(command_similar);
                    scrap_db3.command({
                        text:'website_scrap_data',
                        search:product_name
                    },function( err ,dataa){
                        res.json(dataa);
                    });
                    */
                    //website_scrap_data.find( command_similar ).exec(function(err,dataa){
                        //res.json(dataa);
                    //});
                    //res.json({
                        //error:0,
                        //data:product_data
                    //});
                }
            }
            
        }
    }
});
module.exports = router;
