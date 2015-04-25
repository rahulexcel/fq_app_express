var mongoose = require('mongoose');
var redis = require('redis');
module.exports = function (mongoose) {

    var client = redis.createClient();
    client.on("error", function (err) {
        console.log("Error Redis Connection" + err);
        process.exit(0);
    });
    var conn = mongoose.createConnection('mongodb://127.0.0.1/scrap_db3');
    var scrap_db3 = mongoose.connection;


    var conn1 = mongoose.createConnection('mongodb://127.0.0.1/pricegenie');
    var user_watch_schema = mongoose.Schema({}, {
        strict: false,
        collection: 'user_watch_map'
    });

    var schema_final_fashion_filters = mongoose.Schema({}, {
        strict: false,
        collection: 'final_fashion_filters'
    });
    var schema_filters_category_wise = mongoose.Schema({}, {
        strict: false,
        collection: 'filters_category_wise'
    });
    var schema_website_scrap_data = mongoose.Schema({}, {
        strict: false,
        collection: 'website_scrap_data'
    });
    var schema_parseurl_checklist = mongoose.Schema({}, {
        strict: false,
        collection: 'parseurl_checklist'
    });
    var final_fashion_filters = conn.model('final_fashion_filters', schema_final_fashion_filters);
    var filters_category_wise = conn.model('filters_category_wise', schema_filters_category_wise);
    var website_scrap_data = conn.model('website_scrap_data', schema_website_scrap_data);
    var parseurl_checklist = conn.model('parseurl_checklist',schema_parseurl_checklist);
    var genderTypes = ['M', 'F'];
    var allowedConnectinoType = ['facebook', 'google', 'contacts', 'signup'];
    var wishlistTypes = ['private', 'public', 'shared'];
    var wishlistItemType = ['product', 'custom'];
    var Schema = mongoose.Schema;
    var user_schema = mongoose.Schema({
        name: {type: String, required: true},
        email: {type: String, required: true, index: {unique: true}},
        picture: {type: String, required: true},
        password: {type: String, required: true},
        status: {type: String, default: ''},
        gender: {type: String, enum: genderTypes},
        created_at: {type: Date, default: Date.now},
        updated_at: {type: Date, default: Date.now},
        type: {type: String, required: true, enum: allowedConnectinoType},
        fb_id: {type: String, default: '-1'},
        google_id: {type: String, default: '-1'},
        meta: {
            lists: {type: Number, default: 0},
            products: {type: Number, default: 0},
            followers: {type: Number, default: 0}, //will addup followers from list also
            score: {type: Number, default: 0}, //user score based on items which is updated daily
            score_updated: {type: String}
        },
        friends: [{type: Schema.Types.ObjectId, ref: 'User'}],
        followers: [{type: Schema.Types.ObjectId, ref: 'User'}],
//        channel: {type: Mixed}
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
            likes: {type: Number, default: 0}, //there won't be direct likes on this list, so total likes from all products
            score: {type: Number, default: 0},
            score_updated: {type: String}
        },
        created_at: {type: Date, default: Date.now},
        followers: [{type: Schema.Types.ObjectId, ref: 'User'}]
    });
    wishlist_schema.index({user_id: -1});
    var wishlist_item_schema = mongoose.Schema({
        name: {type: String},
//        list_id: {type: Schema.Types.ObjectId, ref: 'Wishlist'},
//        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        image: {type: String, require: true},
        price: Number,
        href: String,
        img: String,
        org_img: String,
        dimension: Schema.Types.Mixed,
        brand: String,
        cat_id: Number,
        sub_cat_id: Number,
        website: String,
        unique: String,
        location: {type: [Number], index: '2dsphere'},
        zoom: {type: Number},
        type: {type: String, required: true, enum: wishlistItemType},
        description: String,
        created_at: {type: Date, default: Date.now},
        updated_at: {type: Date, default: Date.now},
        access_type: {type: String, require: true, enum: wishlistTypes},
        original: {
            user_id: {type: Schema.Types.ObjectId, ref: 'User'}, //id of original user
            list_id: {type: Schema.Types.ObjectId, ref: 'Wishlist'}, //id of original list
        },
        pins: [{
                user_id: {type: Schema.Types.ObjectId, ref: 'User'},
                created_at: {type: Date, default: Date.now}
            }],
        meta: {
            likes: {type: Number, default: 0}, //total number of likes
            comments: {type: Number, default: 0}, //total number of comments unique user comments
            user_points: {type: Number, default: 0}, //original user points
            list_points: {type: Number, default: 0}  //original list points
        }
    });
    var wishlist_item_assoc_schema = mongoose.Schema({
        list_id: {type: Schema.Types.ObjectId, ref: 'Wishlist'},
        item_id: {type: Schema.Types.ObjectId, ref: 'Wishlist_Item'},
        likes: [{
                user_id: {type: Schema.Types.ObjectId, ref: 'User'},
                created_at: {type: Date, default: Date.now}
            }],
        comments: [{type: Schema.Types.ObjectId, ref: 'Comment'}],
        created_at: {type: Date, default: Date.now}
    });
    wishlist_item_assoc_schema.index({list_id: -1});
    wishlist_item_assoc_schema.index({item_id: -1});
    var item_comment_schema = mongoose.Schema({
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        comment: String,
        picture: String,
        created_at: {type: Date, default: Date.now},
        likes: [{
                user_id: {type: Schema.Types.ObjectId, ref: 'User'},
                created_at: {type: Date, default: Date.now}
            }]
    })
    item_comment_schema.index({user_id: -1});
    var wishlist_item_update_schema = mongoose.Schema({
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        item_id: {type: Schema.Types.ObjectId, ref: 'Wishlist_Item'},
        created_at: {type: Date, default: Date.now}
    });
    var user_item_updates = mongoose.Schema({
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        item_id: {type: Schema.Types.ObjectId, ref: 'Wishlist_Item'},
        created_at: {type: Date, default: Date.now}
    });
    var user_updates = mongoose.Schema({
        user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        type: {type: String, require: true},
        data: {type: Schema.Types.Mixed},
        read: {type: Boolean, default: false},
        gcm_status: {type: Schema.Types.Mixed},
        created_at: {type: Date, default: Date.now}
    });
    var auth_schema = mongoose.Schema({
        user_id: {type: String, required: true},
        api_key: {type: String, required: true},
        api_secret: {type: String, required: true},
        created_at: {type: Date, default: Date.now},
        device: {type: Schema.Types.Mixed}
    });
    auth_schema.index({'api_key': -1});
    var gcm_schema = mongoose.Schema({
        user_id: {type: String, required: true},
        reg_id: {type: String},
        token:  {type: String},
        created_at: {type: Date, default: Date.now},
        device: {type: Schema.Types.Mixed}
    });
    gcm_schema.index({user_id: -1});
//    gcm_schema.index({user_id: -1, api_key: -1});
    var feed_schema = mongoose.Schema({
        image: String,
        original: Schema.Types.Mixed,
        name: String,
        description: String,
        website: String,
        dimension: Schema.Types.Mixed,
        pins: Number,
        likes: Number,
        user_points: Number,
        list_points: Number,
        updated_at: Number,
        created_at: Number,
        baseScore: Number,
        user: Schema.Types.Mixed,
        list: Schema.Types.Mixed
    });
    var friend_request_schema = mongoose.Schema({
        from_user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        to_user_id: {type: Schema.Types.ObjectId, ref: 'User'},
        created_at: {type: Date, default: Date.now},
        updated_at: {type: Date},
        status: String,
    });
    auth_schema.index({'from_user_id': -1, 'to_user_id': -1});
    var feed = conn.model('feed', feed_schema);
    var GCM = conn.model('GCM', gcm_schema);
    var Auth = conn.model('Auth', auth_schema);
    var User = conn.model('User', user_schema);
    var Wishlist = conn.model('Wishlist', wishlist_schema);
    var WishlistItem = conn.model('Wishlist_Item', wishlist_item_schema);
    var WishlistItemAssoc = conn.model('Wishlist_Item_Assoc', wishlist_item_assoc_schema);
    var WishlistItemUpdate = conn.model('Wishlist_Item_Update', wishlist_item_update_schema);
    var Updates = conn.model('User_Update', user_updates);
    var UserItemUpdate = conn.model('User_Item_Update', user_item_updates);
    var Comment = conn.model('Comment', item_comment_schema);
    var feedback_schema = mongoose.Schema({}, {
        strict: false,
        collection: 'feedback',
    });
    var FriendRequest = conn.model('friend_request', friend_request_schema);
    var Feedback = conn.model('feedback', feedback_schema);
    var schema_calc_stats = mongoose.Schema({}, {
        strict: false,
        collection: 'calcuation_stats',
    });
    var Calculation = conn.model('calcuation_stats', schema_calc_stats);
    var user_watch_map = conn1.model('user_watch_map', user_watch_schema);
    var Grid = require('gridfs-stream');
    Grid.mongo = mongoose.mongo;
    var gfs = Grid(conn.db);
    return function (req, res, next) {
        req.feed = feed;
        req.scrap_db3 = scrap_db3;
        req.conn_final_fashion_filters = final_fashion_filters;
        req.conn_filters_category_wise = filters_category_wise;
        req.conn_website_scrap_data = website_scrap_data;
        req.conn_parseurl_checklist = parseurl_checklist;
        req.Auth = Auth;
        req.User = User;
        req.Wishlist = Wishlist;
        req.Feedback = Feedback;
        req.WishlistItem = WishlistItem;
        req.WishlistItemAssoc = WishlistItemAssoc;
        req.WishlistItemUpdate = WishlistItemUpdate;
        req.Updates = Updates;
        req.UserItemUpdate = UserItemUpdate;
        req.Comment = Comment;
        req.gfs = gfs;
        req.GCM = GCM;
        req.FriendRequest = FriendRequest;
        req.Calculation = Calculation;
        req.user_watch_map = user_watch_map;
        req.redis = client;
        next();
    }
}
