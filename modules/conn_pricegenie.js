module.exports = function(mongoose){
    //var conn = mongoose.createConnection('mongodb://127.0.0.1/pricegenie');
    //var schema_category = mongoose.Schema({},{
       // strict:false,
        //collection:'category',
    //});
    //var category = conn.model('category',schema_category);
    return function( req, res, next){
        //req.mongoose = mongoose;
        //req.conn_category = category;
        next();
    }
}