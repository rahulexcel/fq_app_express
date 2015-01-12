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
    var allowedConnectinoType = ['facebook', 'google', 'contacts', 'signup'];
    var wishlistTypes = ['private', 'public'];
    var wishlistItemType = ['product', 'custom'];
    var Schema = mongoose.Schema;
    var user_schema = mongoose.Schema({
        name: {type: String, required: true},
        email: {type: String, required: true, index: {unique: true}},
        picture: {type: String, required: true},
        password: {type: String, required: true},
        gender: {type: String, enum: genderTypes},
        created_at: {type: Date, default: Date.now},
        type: {type: String, required: true, enum: allowedConnectinoType},
        fb_id: {type: String, default: '-1'},
        google_id: {type: String, default: '-1'},
        meta: {
            lists: {type: Number, default: 0},
            products: {type: Number, default: 0}
        },
        friends: [{type: Schema.Types.ObjectId, ref: 'User'}]

    });
    user_schema.index({email: -1}); //schema level
//    user_schema.set('autoIndex', false);

    var wishlist_schema = mongoose.Schema({
        name: {type: String, require: true},
        description: {type: String, require: true},
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        type: {type: String, require: true, enum: wishlistTypes},
        shared_ids: [{type: Schema.Types.ObjectId, ref: 'User'}],
        meta: {
            products: {type: Number, default: 0},
            likes: {type: Number, default: 0} //there won't be direct likes on this list, so total likes from all products
        },
        created_at: {type: Date, default: Date.now},
        followers: [{type: Schema.Types.ObjectId, ref: 'User'}]
    });
    wishlist_schema.index({user_id: -1});
    var wishlist_item_schema = mongoose.Schema({
        name: {type: String},
        list_id: {type: Schema.Types.ObjectId, ref: 'Wishlist'},
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        image: {type: String, require: true},
        price: Number,
        href: String,
        img: String,
        brand: String,
        cat_id: Number,
        sub_cat_id: Number,
        website: String,
        unique: String,
        location: {type: [Number], index: '2dsphere'},
        zoom: {type: Number},
        type: {type: String, required: true, enum: wishlistItemType},
        description: String,
        likes: [{type: Schema.Types.ObjectId, ref: 'User'}],
        comments: [{
                user_id: String,
                comment: String,
                picture: String,
                created_at: Date
            }],
        created_at: {type: Date, default: Date.now}
    });
    var User = conn.model('User', user_schema);
    var Wishlist = conn.model('Wishlist', wishlist_schema);
    var WishlistItem = conn.model('wishlist_item', wishlist_item_schema);
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
        req.Feedback = Feedback;
        req.WishlistItem = WishlistItem;
        req.gfs = gfs;
        next();
    }
}
