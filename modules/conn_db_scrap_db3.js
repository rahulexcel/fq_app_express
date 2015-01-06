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

    var genderTypes = ['M', 'F'];
    var allowedConnectinoType = ['facebook', 'google', 'contacts'];
    var wishlistTypes = ['private', 'public', 'friends'];

    var user_schema = mongoose.Schema({
        name: {type: String, required: true},
        email: {type: String, required: true, index: {unique: true}},
        picture: {type: String, required: true},
        password: {type: String, required: true},
        gender: {type: String, enum: genderTypes},
        created_at: {type: Date, default: Date.now},
        type: {type: String, required: true, enum: allowedConnectinoType},
        fb_id: {type: String, default: ''},
        google_id: {type: String, default: ''},
        meta: {
            friends: {type: Number, default: 0},
            followers: {type: Number, default: 0},
            lists: {type: Number, default: 0},
            products: {type: Number, default: 0}
        }

    });
    user_schema.index({email: -1}); //schema level
//    user_schema.set('autoIndex', false);

    var connection_schema = mongoose.Schema({
        type: {type: String, required: true, enum: allowedConnectinoType},
        type_id: {type: String, required: true, index: {unique: true}},
        name: {type: String, required: true},
        picture: {type: String, required: true},
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        connected_ids: [{type: Schema.Types.ObjectId, ref: 'User'}],
        created_at: {type: Date, default: Date.now}

    });
    connection_schema.index({type: -1, type_id: -1});
    connection_schema.index({user_id: -1});
    connection_schema.index({connected_ids: -1});
//    connection_schema.set('autoIndex', false);


    var wishlist_schema = mongoose.Schema({
        name: {type: String, require: true},
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        type: {type: String, require: true, enum: wishlistTypes},
        shared_ids: [{type: Schema.Types.ObjectId, ref: 'User'}],
        meta: {
            likes: {type: Number, default: 0},
            products: {type: Number, default: 0}
        }
    });
    var wishlist_item_schema = mongoose.Schema({
        name: {type: String, require: true},
        image: {type: String, require: true},
        price: String,
        website: String,
        href: String,
        unique: String,
        meta: {
            likes: {type: Number, default: 0}
        },
        comments: [{
                user_id: String,
                comment: String,
                picture: String,
                created_at: Date
            }]
    });

    var User = conn.model('User', user_schema);
    var Wishlist = conn.model('wishlist', wishlist_schema);

    var feedback_schema = mongoose.Schema({}, {
        strict: false,
        collection: 'feedback',
    });

    var Feedback = conn.model('feedback', feedback_schema);

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
