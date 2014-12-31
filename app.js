var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var multer = require('multer')

var module_config = require('./modules/config');
var module_conn_pricegenie = require('./modules/conn_pricegenie');
var module_conn_db_scrap_db3 = require('./modules/conn_db_scrap_db3');
var mail = require('./modules/mail');

var v1_routes_catalog = require('./routes/v1/catalog'); // arun :: 1st step
var v1_routes_account = require('./routes/v1/account');
var v1_routes_wishlist = require('./routes/v1/wishlist');
var v1_routes_product = require('./routes/v1/product');
var v1_routes_search = require('./routes/v1/search');
var v1_routes_feedback = require('./routers/v1/feedback');

var app = express();

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
app.use(express.static(path.join(__dirname, 'uploads')));

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
// work accroding to version basis 
app.use('/v1/catalog', v1_routes_catalog);
app.use('/v1/account', v1_routes_account);
app.use('/v1/wishlist', v1_routes_wishlist);
app.use('/v1/product', v1_routes_product);
app.use('/v1/search', v1_routes_search);
app.use('/v1/feedback', v1_routes_feedback);
//app.use('/products',routes_catalog); //arun :: 2nd step


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
            message: err.err
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
        message: err.err
    });
});


module.exports = app;
