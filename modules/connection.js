module.exports = function(mongoose,database,table_name){
    
    console.log('aaaa');
    var conn = mongoose.createConnection('mongodb://127.0.0.1/'+database);
    var schema = mongoose.Schema({},{
        strict:false,
        collection:table_name,
    });
    var conn_table_name = conn.model( table_name, schema );
    return function( req, res, next){
        req.conns = new Array;
        req.conns[table_name] = conn_table_name;
        console.log(Object.sizereq.length)
        console.log('arun kumar');
        next();
    }
}



/*

module.exports = function(mongoose){
    var conn = mongoose.createConnection('mongodb://127.0.0.1/scrap_db3');
    var schema_final_fashion_filters = mongoose.Schema({},{
        strict:false,
        collection:'final_fashion_filters',
    });
    var schema_website_scrap_data = mongoose.Schema({},{
        strict:false,
        collection:'website_scrap_data',
    });
    var conn_final_fashion_filters = conn.model('final_fashion_filters',schema_final_fashion_filters);
    var conn_website_scrap_data = conn.model('website_scrap_data',schema_website_scrap_data);
    return function( req, res, next){
        req.conn = conn;
        req.conn_final_fashion_filters = conn_final_fashion_filters;
        req.conn_website_scrap_data = conn_website_scrap_data;
        next();
    }
    //website_scrap_data.find({
            //filter:'brand',
            //cat_id:30
        //},function( err, data){
            //console.log(data.length);
            //console.log('this is connection module');
            //process.exit(0);
        //});
}

*/
