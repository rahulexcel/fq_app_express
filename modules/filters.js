module.exports = function(){
    
    return function(req,res,next){
        var filters_category_wise = req.conn_filters_category_wise;
        var where = {
            'cat_id':req.body.cat_id,
            'sub_cat_id':req.body.sub_cat_id,
        };
        var filters = {};
        filters_category_wise.where( where ).find( results );
        function results( err, data ){
            if( data.length > 0 ){
                raw_filters = data[0].get('filters').api_filters;
                res.json(raw_filters);
                process.exit(0);
                
                
                
                Object.keys(raw_filters).forEach(function(key){
                    console.log(key);
                });
                process.exit(0);
                console.log(raw_filters);
                console.log('arun kumar');
                res.json(raw_filters);
            }
            //console.log(data.length);
            //res.json( data );
            //Object.keys(data).forEach(function(key){
                //var x = data[key];
                //filter = x.get('filter');
                //if( filter == 'color' ){
                    
                //}
                //console.log(filter);
            //});
            //res.json(data);
            //process.exit(0);
        }
        next();
    }
}