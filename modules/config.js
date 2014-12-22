module.exports = function(){
    return function( req, res, next){
        config = {
            'products_per_page':20,
        };
        body = {
            'cat_id':30,
            'sub_cat_id':3001,
            'father_key':'men',
            'father_text':'men',
            'page':1,
            //filter : [{
                //size : [size1,soze2             ]
            //}]
        };
        req.config = config;
        req.body = body;
        next();
    }
}