module.exports = function (mongoose) {
    var conn = mongoose.createConnection('mongodb://127.0.0.1/scrap_db3');

    var scrap_db3 = mongoose.connection;

    var schema_final_fashion_filters = mongoose.Schema({}, {
        strict: false,
        collection: 'final_fashion_filters',
    });
    var schema_filters_category_wise = mongoose.Schema({}, {
        strict: false,
        collection: 'filters_category_wise',
    });
    var schema_website_scrap_data = mongoose.Schema({}, {
        strict: false,
        collection: 'website_scrap_data',
    });
    var final_fashion_filters = conn.model('final_fashion_filters', schema_final_fashion_filters);
    var filters_category_wise = conn.model('filters_category_wise', schema_filters_category_wise);
    var website_scrap_data = conn.model('website_scrap_data', schema_website_scrap_data);

    var user_schema = mongoose.Schema({}, {
        strict: false,
        collection: 'user',
    });
    var User = conn.model('user', user_schema);

    var wishlist_schema = mongoose.Schema({}, {
        strict: false,
        collection: 'wishlist',
    });

    var Wishlist = conn.model('wishlist', wishlist_schema);

    var Grid = require('gridfs-stream');
    Grid.mongo = mongoose.mongo;
    var gfs = Grid(conn.db);

    return function (req, res, next) {
        req.scrap_db3 = scrap_db3;
        req.conn_final_fashion_filters = final_fashion_filters;
        req.conn_filters_category_wise = filters_category_wise;
        req.conn_website_scrap_data = website_scrap_data;
        req.User = User;
        req.Wishlist = Wishlist;
        req.gfs = gfs;
        next();
    }
}
