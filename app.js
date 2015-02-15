var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var multer = require('multer')
var useragent = require('express-useragent');

var module_config = require('./modules/config');
var module_conn_pricegenie = require('./modules/conn_pricegenie');
var module_conn_db_scrap_db3 = require('./modules/conn_db_scrap_db3');
var user_helper = require('./modules/v1/user_helper');
var html_helper = require('./modules/v1/html_helper');
var mail = require('./modules/mail');
var module_recycle_data = require('./modules/recycle_data');
var module_product = require('./modules/product');

var v1_routes_catalog = require('./routes/v1/catalog'); // arun :: 1st step
var v1_routes_account = require('./routes/v1/account');
var v1_routes_wishlist = require('./routes/v1/wishlist');
var v1_routes_product = require('./routes/v1/product');
var v1_routes_feedback = require('./routes/v1/feedback');
var v1_routes_parseurl = require('./routes/v1/parseurl');


var app = express();
app.use(useragent.express());
app.use(express.static(path.join(__dirname, 'public')));
// view engine setup
var exphbs = require('express-handlebars');
app.engine('.hbs', exphbs({defaultLayout: 'single', extname: '.hbs'}));
app.set('view engine', '.hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(multer({dest: './uploads/'}))
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());


app.use(function (req, res, next) {
    console.log(req.body);
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
    next();
});

app.use(module_config());
app.use(module_conn_pricegenie(mongoose));
app.use(module_conn_db_scrap_db3(mongoose));
app.use(mail());
app.use(module_recycle_data());
app.use(module_product());
app.use(user_helper());
app.use(html_helper());

app.use(function (req, res, next) {
    var path = req.path;

    var auth_paths = [
        'account/update',
        'account/remove_picture',
        'account/update/picture',
        'invite/google/lookup',
        'invite/facebook/lookup',
        'social/user/follow',
        'social/list/follow',
        'social/list/comment',
        'social/item/pin',
        'social/item/like',
        'wishlist/add',
        'wishlist/item/add'
    ];
    req.auth = false;
    for (var i = 0; i < auth_paths.length; i++) {
        if (path.indexOf(auth_paths[i]) != -1) {
            console.log('auth required');
            req.auth = true;
            break;
        }
    }
    next();
});
var auth = require('./modules/v1/auth');
app.use(auth());
app.use(function (req, res, next) {
    console.log('Body After Auth');
    console.log(req.body);
    next();
});
// work accroding to version basis 
app.use('/v1/catalog', v1_routes_catalog);
app.use('/v1/account', v1_routes_account);
app.use('/v1/wishlist', v1_routes_wishlist);
app.use('/v1/product', v1_routes_product);
app.use('/v1/feedback', v1_routes_feedback);
app.use('/v1/friends', require('./routes/v1/invite'));
app.use('/v1/social', require('./routes/v1/social'));
app.use('/v1/picture', require('./routes/v1/picture'));
//app.use('/products',routes_catalog); //arun :: 2nd step
app.use('/v1/parseurl', v1_routes_parseurl);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        console.log(err);
        if (err.status)
            res.status(err.status);
        res.json({
            error: 2,
            err: err,
            message: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    console.log(err);
    if (err.status)
        res.status(err.status);
    res.json({
        error: 2,
        err: err,
        message: err
    });
});


module.exports = app;
