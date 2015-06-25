var express = require('express');
var router = express.Router();
var urlMod = require('url');
var request = require('request');
var zlib = require('zlib');
var jsdom = require('jsdom');
var fs = require('fs');
var util = require('util'); 
var mongoose = require('mongoose');
//
//var conn4 = mongoose.createConnection('mongodb://pricegenie.co/scrap_db3');
//var scrap_data_schema2 = mongoose.Schema({}, {
//    strict: false,
//    collection: 'website_scrap_data'
//});
//var scrap_data = conn4.model('website_scrap_data', scrap_data_schema2);

router.get('/', function(req, res) {
    var url = req.query.url;
    var urlsource = req.query.source;
    if( typeof urlsource == 'undefined' || urlsource == '' ){
        urlsource = '-NA-';
    }
    var pid = req.query.pid;
    if( typeof pid == 'undefined' || pid == '' ){
        pid = false;
    }
    //-----------------------------------------------------------------------------------------------
    var jquery = fs.readFileSync(__dirname + '/../../jquery-1.11.2.js').toString();
    var jQuery;
    var $;
    var window;
    var website_detected = '';
    var windowURL = '';
    function stringToArray(str, expby) {
        var ret = new Array();
        var split = str.split(expby);
        for (i = 0; i < split.length; i++) {
            ss = split[i];
            ss = ss.trim();
            if (ss.length > 0) {
                ret.push(ss);
            }
        }
        return ret;
    }
    function arrayToString(arr, impby) {
        return arr.join(impby);
    }
    function getHostName(url) {
        var s = url.replace('http://','').replace('https://','').replace('www.','').split(/[/?#]/)[0];
        if( s == null ){
            var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
            if (match != null && match.length > 2 &&
                    typeof match[2] === 'string' && match[2].length > 0) {
                return match[2];
            } else {
                return null;
            }
        }
        return s;
    }
    function extractJsonData( website,$){
        var ret = false
        if( website == 'zovi' ){
            if($('script').length > 0 ){
                $('script').each(function(){
                    curr_script = $(this).text();
                    if( curr_script.indexOf('optionDetails') != -1){
                        curr_script = curr_script.replace('var optionDetails=','');
                        curr_script = curr_script.replace(';','');
                        curr_script = curr_script.replace('<!--option-details-begin-->','');
                        curr_script = curr_script.replace('<!--option-details-end-->','');
                        //curr_script_1 = curr_script;
                        ret = JSON.parse(curr_script);
                    }
                });
                return ret;
            }else{
                return ret;
            }
        }
    }
    function logg(text) {
        console.log(text);
    }
    function identifyWebsite(url) {
        var websites = [
            {'site': 'flipkart.com', 'code': 'Flipkart'},
            {'site': 'snapdeal.com', 'code': 'Snapdeal'},
            {'site': 'shopclues.com', 'code': 'ShopClues'},
            {'site': 'tradus.com', 'code': 'Tradus'},
            {'site': 'shopping.indiatimes.com', 'code': 'Indiatimes'},
            {'site': 'amazon.in', 'code': 'amazon'},
            {'site': 'camera.zoomin.com', 'code': 'Zoomin'},
            {'site': 'saholic.com', 'code': 'Saholic'},
            {'site': 'landmarkonthenet.com', 'code': 'Landmark'},
            {'site': 'infibeam.com', 'code': 'Infibeam'},
            {'site': 'homeshop18.com', 'code': 'Homeshop'},
            {'site': 'cromaretail.com', 'code': 'Croma'},
            {'site': 'crossword.in', 'code': 'Crossword'},
            {'site': 'ebay.in', 'code': 'eBay'},
            {'site': 'rediff.com', 'code': 'Rediff'},
            {'site': 'uread.com', 'code': 'uRead'},
            {'site': 'bookadda.com', 'code': 'Bookadda'},
            {'site': 'justbooks.in', 'code': 'Justbooks'},
            {'site': 'indianbooks.co.in', 'code': 'Indianbooks'},
            {'site': 'yebhi.com', 'code': 'Yebhi'},
            {'site': 'adexmart.com', 'code': 'Adexmart'},
            {'site': 'naaptol.com', 'code': 'Naaptol'},
            {'site': 'mirchimart.com', 'code': 'MirchiMart'},
            {'site': 'themobilestore.in', 'code': 'TheMobileStore'},
            {'site': 'bagittoday.com', 'code': 'Bagittoday'},
            {'site': 'letsshop.in', 'code': 'Letshop'},
            {'site': 'edabba.com', 'code': 'eDabba'},
            {'site': 'onemi.in', 'code': 'Onemi'},
            {'site': 'suzalin.com', 'code': 'Suzalin'},
            {'site': 'giffiks.com', 'code': 'Giffiks'},
            {'site': 'maniacstore.com', 'code': 'ManiacStore'},
            {'site': 'ezeekart.com', 'code': 'ezeekart'},
            {'site': 'pepperfry.com', 'code': 'Pepperfry'},
            {'site': 'egully.com', 'code': 'egully'},
            {'site': 'shopbychoice.com', 'code': 'shopbychoice'},
            {'site': 'next.co.in', 'code': 'Next'},
            {'site': 'shopsite.in', 'code': 'Shopsite'},
            {'site': 'letskart.com', 'code': 'Letskart'},
            {'site': 'futurebazaar.com', 'code': 'FutureBazaar'},
            //        {'site':'amazon.com','code':'Kindle'},
            //        {'site':'play.google.com','code':'Play'},
            {'site': 'acadzone.com', 'code': 'acadzone'},
            {'site': 'reliancedigital.in', 'code': 'Reliance'},
            {'site': 'dailyobjects.com', 'code': 'dailyobjects'},
            {'site': 'ibhejo.com', 'code': 'ibhejo'},
            {'site': 'kaunsa.com', 'code': 'Kaunsa'},
            {'site': 'browsecart.com', 'code': 'browsecart'},
            {'site': 'cosmetix.in', 'code': 'cosmetix'},
            {'site': 'goodlife.com', 'code': 'goodlife'},
            {'site': 'healthgenie.in', 'code': 'healthgenie'},
            {'site': 'healthkart.com', 'code': 'healthkart'},
            {'site': 'nykaa.com', 'code': 'nykaa'},
            {'site': 'ezoneonline.in', 'code': 'ezoneonline'},
            {'site': 'hushbabies.com', 'code': 'hushbabies'},
            {'site': 'babyoye.com', 'code': 'babyoye'},
            {'site': 'firstcry.com', 'code': 'firstcry'},
            {'site': 'littleshop.in', 'code': 'littleshop'},
            {'site': 'jabong.com', 'code': 'jabong'},
            {'site': 'mybabycart.com', 'code': 'mybabycart'},
            {'site': 'grabmore.in', 'code': 'grabmore'},
            {'site': 'medplusbeauty.com', 'code': 'medplusbeauty'},
            {'site': 'myntra.com', 'code': 'myntra'},
            {'site': 'vijaysales.com', 'code': 'vijaysales'},
            {'site': 'greendust.com', 'code': 'greendust'},
            {'site': 'basicslife.com', 'code': 'basicslife'},
            {'site': 'bewakoof.com', 'code': 'bewakoof'},
            {'site': 'fashionara.com', 'code':'fashionara'},
            {'site':'koovs.com','code':'koovs'},
            {'site':'moodsofcloe.com','code':'moodsofcloe'},
            {'site':'prettysecrets.com','code':'prettysecrets'},
            {'site':'shopnineteen.com','code':'shopnineteen'},
            {'site':'yepme.com','code':'yepme'},
            {'site':'zivame.com','code':'zivame'},
            {'site':'zovi.com','code':'zovi'},
            {'site':'trendin.com','code':'trendin'},
            {'site':'fabfurnish.com','code':'fabfurnish'},
            {'site':'zansaar.com','code':'zansaar'},
            {'site':'shoppersstop.com','code':'shoppersstop'},
            {'site':'urbanladder.com','code':'urbanladder'},
            {'site':'pepperfry.com','code':'Pepperfry'},
            {'site':'paytm.com','code':'paytm'},
            {'site':'forever21.com','code':'forever21'},
            {'site':'fabindia.com','code':'fabindia'},
            {'site':'zara.com','code':'zara'},
            {'site':'bata.in','code':'bata'},
            {'site':'miracas.com','code':'miracas'},
            {'site':'faballey.com','code':'faballey'},
            {'site':'elitify.com','code':'elitify'},
            {'site':'indianroots.com','code':'indianroots'},
            {'site':'jaypore.com','code':'jaypore'},
            {'site':'indiacircus.com','code':'indiacircus'},
        ];
        //string matching on url basis
        //var value = location.hostname;
        //var string1 = location.href;
        var value = getHostName(url);
        var string1 = value;
        var foundKeys = '';
        for (i = 0; i < websites.length; i++) {
            if (value.toLowerCase().indexOf(websites[i].site.toLowerCase()) != -1) {
                website_detected = websites[i].code;
                if (website_detected == 'amazon') {
                    if (string1.indexOf('node=') != -1) {
                        log('node= found hence amazon not detected!');
                        website_detected = '';
                        continue;
                    }
                } else if (website_detected == 'eBay') {
                    if (string1.indexOf('sch/') != -1) {
                        log('sch/ found hence ebay not detected!');
                        website_detected = '';
                        continue;
                    }
                } else if (website_detected == 'Indiatimes') {
                    //commented by arun on 23 june 2015 since no p_in url 
                    //if (string1.indexOf('p_') != -1) {
                    //} else {
                       // log('p_ found hence indiatimes not detected!');
                        //website_detected = '';
                        //continue;
                    //}
                }
                //            foundKeys = websites[i].txt;
                return true;
                //logg(associativeArray[i].txt);
                break;
            }
        }
        //check empty for both cases
        if (foundKeys.length > 0) {
            logg(foundKeys);
            var strData = foundKeys.trim().split(',');
            for (i = 0; i < strData.length; i++) {
                var matching = string1.match(strData[i]);
                logg(matching + 'returned by ' + strData[i] + 'on ' + string1);
                if (!(matching == '' || matching == null)) {
                    logg('is product page matched by ' + strData[i]);
                    return true;
                }
            }
        }
        return false;
    }
    function isProductPage(url) {
        if (url.indexOf('forever21') != -1) {
            if (url.indexOf('Product.aspx') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('pepperfry') != -1) {
            if (url.indexOf('.html') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if( url.indexOf('paytm') != -1){
            if( url.indexOf('shop/p/') != -1 ){
                return true;
            }else{
                return false;
            }
        }
        else if (url.indexOf('shoppersstop') != -1) {
            if (url.indexOf('.html') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('fabfurnish') != -1) {
            if (url.indexOf('.html') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('trendin') != -1) {
            if (url.indexOf('.html') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('zivame') != -1) {
            if (url.indexOf('.html') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('moodsofcloe') != -1) {
            if (url.indexOf('product/') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('bewakoof') != -1) {
            //if (url.indexOf('product/') != -1) {
                return true;
            //} else {
               // return false;
            //}
        }
        else if (url.indexOf('fashionara') != -1) {
            if (url.indexOf('.html') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('vijaysales') != -1) {
            if (url.indexOf('buy/') !== -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('safetykart') != -1) {
            if (url.indexOf('Products/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('purplle') != -1) {
            if (url.indexOf('product/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('grabmore') != -1) {
            if (url.indexOf('products/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('ezoneonline') != -1) {
            if (url.indexOf('Products/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('healthkart') != -1) {
            if (url.indexOf('sv/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('kaunsa') != -1) {
            if (url.indexOf('Detail/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('next') != -1) {
            if (url.indexOf('product/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('maniacstore') != -1 || url.indexOf('ezeekart') != -1 || url.indexOf('egully') != -1) {
            if (url.indexOf('products/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('suzalin') != -1) {
            if (url.indexOf('Products/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('bagittoday') != -1) {
            if (url.indexOf('pr-') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('themobilestore') != -1) {
            if (url.indexOf('p-') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('naaptol') != -1 || url.indexOf('mirchimart') != -1) {
            if (url.indexOf('p/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('yebhi') != -1) {
            if (url.indexOf('PD/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('rediff') != -1) {
            if (url.indexOf('product/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('ebay') != -1) {
            if (url.indexOf('ptd/') !== -1 || url.indexOf('itm/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('homeshop18') != -1) {
            if (url.indexOf('product:') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('flipkart') != -1) {
            if (url.indexOf('p/') !== -1 || url.indexOf('pid=') != -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('snapdeal') != -1) {
            if (url.indexOf('product/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('tradus') != -1) {
            if (url.indexOf('p/') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('shopping.indiatimes') != -1) {
            if (url.indexOf('p_') !== -1) {
                return true;
            } else {
                return false;
            }
        } else if (url.indexOf('amazon') != -1) {
            if (url.indexOf('product/') !== -1 || url.indexOf('dp/') !== -1 || url.indexOf('offer-listing/') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('myntra') != -1) {
            if (url.indexOf('buy') != -1) {
                return true;
            } else {
                return false;
            }
        }
        else if (url.indexOf('jabong') != -1) {
            if (url.indexOf('.html') != -1) {
                return true;
            } else {
                return false;
            }
        }
        
        return true;
    }
    function getNameHtml() {
        var ptitle = '';
        if (website_detected == 'Flipkart') {
            ptitle = jQuery('h1[itemprop=name]:first').text();
            var ele = jQuery('h1[itemprop=name]').siblings('.extra_text').first();
            if (!ele.hasClass('nprod-specs')) {
                ptitle += ' ' + ele.text();
            }
            ptitle = ptitle.replace("(", "");
            ptitle = ptitle.replace(")", "");
        } 
        else if( website_detected == 'faballey'){
            if( $('div.prodRightSec').find('div.title7').find('h1').length > 0 ){
                price = $('div.prodRightSec').find('div.title7').find('h1').text();
            }
            price = getPrice(price);
        }
        else if (website_detected == 'Landmark') {
            ptitle = $('h1:first').text();
        }else if (website_detected == 'elitify') {
            ptitle = $('h1.product_name').text();
        } else if (website_detected == 'ezeekart') {
            ptitle = $('.product_name').text();
        } else if (website_detected == 'Croma') {
            ptitle = $('.product').find('h1:first').text();
        } else if (website_detected == 'babyoye') {
            ptitle = $('.productNameMain').children('.productName').text();
        } else if (website_detected == 'MirchiMart') {
            ptitle = $('#product_detail_name').children('h1').text();
        } else if (website_detected == 'ManiacStore') {
            ptitle = $('.productTitle').children('h1').text();
        } else if (website_detected == 'ibhejo') {
            ptitle = $('.product_title').children('h2').text();
        } else if (website_detected == 'Adexmart') {
            ptitle = $('#short_description_block').find('strong').text();
        } else if (website_detected == 'egully') {
            ptitle = $('h1:first').text();
        } else if (website_detected == 'Suzalin') {
            ptitle = $('.productsDetialsRHS').children('h1:first').text();
        } else if (website_detected == 'littleshop') {
            ptitle = $('.rightproduct').children('h1:first').text();
        } else if (website_detected == 'shopbychoice') {
            ptitle = $('.detail-right-wrapper').children('h2').text();
        } else if (website_detected == 'cosmetix') {
            ptitle = $('.cos_h3').text() + $('.cos_h2').text();
        } else if (website_detected == 'uRead') {
            ptitle = $('.title').children('label').text();
        } else if (website_detected == 'Saholic') {
            ptitle = $('.product-main-title').children('.name').text();
        } else if (website_detected == 'moodsofcloe') {
            ptitle = $('#htext').children('h1').text();
        } else if( website_detected == 'yepme'){
             if( $('span#camphead').length > 0 ){
                ptitle = $('span#camphead').text();
            }
        }else if( website_detected == 'zivame'){
             if( $('h1.proTitle').length > 0 ){
                ptitle = $('h1.proTitle').text();
            }
        }else if( website_detected == 'zovi'){
            zovi_json = extractJsonData( website_detected,$);
            ptitle = zovi_json.title;
            if((ptitle == '' || ptitle == null ) &&$('h2#product-title').length > 0 ){
                ptitle = $('h2#product-title').text();
            }
        }else if( website_detected == 'trendin'){
            if( $('div.product_rhs_col').find('h2').length > 0  ){
                ptitle = $('div.product_rhs_col').find('h2').text();
            }
        }else if( website_detected == 'fabfurnish'){
            if($('h1.prd-title-new').length > 0 ){
                ptitle = $('h1.prd-title-new').text();
            }
        }else if( website_detected == 'shoppersstop'){
            if( $('div.productName').find('h1').length > 0 ){
                ptitle = $('div.productName').find('h1').text();
            }
        }else if( website_detected == 'Pepperfry'){
            if($('h2.vip_heading_1').length > 0 ){
                ptitle = $('h2.vip_heading_1').text();
            }
        }else if( website_detected == 'forever21'){
            if( $('font#ItemName').length > 0 ){
                ptitle = $('font#ItemName').text();
            }
        }else if( website_detected == 'fabindia'){
            if( $('div#product-col-middle').find('h1').length > 0 ){
                ptitle = $('div#product-col-middle').find('h1').text();
            }
        }else if( website_detected == 'zara'){
            if( $('div.right').find('h1').length > 0 ){
                ptitle = $('div.right').find('h1').text();
            }
        }
        else if( website_detected == 'bata'){
            if( $('div.product-name').find('h1').length > 0 ){
                ptitle = $('div.product-name').find('h1').text();
            }
        }else if( website_detected == 'miracas'){
            if( $('div#pb-left-column').find('h1').length > 0 ){
                ptitle = $('div#pb-left-column').find('h1').text();
            }
        }
        if (ptitle)
            ptitle = ptitle.trim();
        else {
            ptitle = jQuery('h1[itemprop=name]:first').text();
            // var large_height = 0;
            //        var large_width = 0;
            //        var large_image = false;
            //        jQuery('img').each(function(){
            //                logg($(this).outerWidth() + 'x' + $(this).outerHeight());
            //                if($(this).attr('src') && $(this).outerWidth() > large_width && $(this).outerHeight() > large_height && $(this).is(':visible')) {
            //                    large_image = $(this);
            //                    large_width = $(this).outerWidth();
            //                    large_height = $(this).outerHeight();
            //                }
            //        });
            //        if(large_image){
            //            ptitle = (large_image.attr('title') || large_image.attr('alt'));
            //            logg(large_width + 'xxx' + large_height + 'xxxx' + large_image.attr('src'));
            //data['img_src'] = large_image.attr('src');
            //        }else{
            //            ptitle = '';
            //        }
            if (ptitle == 'undefined' || ptitle == false) {

                //works for zoomin
                if (ptitle == 'undefined' || ptitle == false) {
                    ptitle = $('.product-view').find('h1:first').text();
                    if (ptitle == 'undefined' || ptitle.length == 0 || ptitle == false) {
                        if (ptitle == 'undefined' || ptitle.length == 0 || ptitle == false) {
                            ptitle = $('.product-name:first').text();

                            if (ptitle == 'undefined' || ptitle.length == 0 || ptitle == false) {
                                ptitle = $('h1:first').text();
                            }
                        }
                    }
                }
            }
        }
        return ptitle;
    }
    function getPriceHtml() {
        var price = 0;
        if( website_detected == 'forever21'){
            if( $('font.items_price').length > 0 ){
                price = $('font.items_price').text();
            }
            price = getPrice(price);
        }
        else if( website_detected == 'faballey'){
            if( $('div.prodRightSec').find('div.title7').find('h3').length > 0 ){
                price = $('div.prodRightSec').find('div.title7').find('h3').text();
            }
            price = getPrice(price);
        }
        else if( website_detected == 'shoppersstop'){
            if( $('div.price-box').find('span.special-price').length > 0 ){
                price = $('div.price-box').find('span.special-price').text();
                price = getPrice(price);
            }
            if( ( price == 0 || price == '') && $('div.price-box').find('span.regular-price').length > 0 ){
                price = $('div.price-box').find('span.regular-price').text();
                price = getPrice(price);
            }
            if( ( price == 0 || price == '') &&  $('div.price-box').find('span.price').length > 0 ){
                price = $('div.price-box').find('span.price').text();
                price = getPrice(price);
            }
        }
        else if( website_detected == 'zansaar'){
            if( $('span[itemprop="price"]').length > 0 ){
                price = $('span[itemprop="price"]').text();
                price = getPrice(price);
            }
        }
        else if( website_detected == 'fabfurnish'){
            if( $('#price_box').length > 0 ){
                price = $('#price_box').text();
            }
            if( $('#special_price_box').length > 0 ){
                price = $('#special_price_box').text();
            }
            price = getPrice(price);
        }
        else if( website_detected == 'trendin'){
            $('script').each(function(){
                var scriptText = $(this).text();
                if( scriptText.indexOf('discount_price') != -1 ){
                    price = getTextBetween('var discount_price=',';',scriptText);
                }
            });
            if( typeof price == 'undefined' || price == '' || price == 0 || price == null){
                if( $('div.lhs_block price_block').find('h1').length > 0 ){
                    price = $('div.lhs_block price_block').find('h1').text();
                }
            }
            if( typeof price == 'undefined' || price == '' || price == 0 || price == null){
                if($('div.price_block').find('h1').length > 0 ){
                    price = $('div.lhs_block price_block').find('h1').text();
                }
            }
            if( typeof price == 'undefined' || price == '' || price == 0 || price == null){
                if($('div.price_detail_block').find('h1').length > 0 ){
                    price = $('div.price_detail_block').find('h1').text();
                }
            }
            price = getPrice(price);
        }
        else if( website_detected == 'zovi'){
            if($('label#price').length > 0 ){
                price = $('label#price').text();
            }
            price = getPrice(price);
        }
        else if( website_detected == 'zivame'){
            if( $('div.proPrice').find('span').length > 0 ){
                price = getPrice($('div.proPrice').find('span').text());
            }
        }
        else if( website_detected == 'yepme'){
            if( $('span#lblPayHead').length > 0 ){
                pp = $('span#lblPayHead').text();
            }
            if( $('span#lblSpecialPrice').length > 0 ){
                pp = $('span#lblSpecialPrice').text();
            }
            price = getPrice(pp);
        }
        else if( website_detected == 'shopnineteen'){
            var pp = $('div.price-box').find('span.price').text();
            if( $('div.price-box').find('p.old-price').find('span.price').length > 0 ){
                pp = $('div.price-box').find('p.old-price').find('span.price').text();
            }
            if( $('div.price-box').find('p.special-price').find('span.price').length > 0 ){
                pp = $('div.price-box').find('p.special-price').find('span.price').text();
            }
            price = getPrice(pp);
        }
        else if( website_detected == 'prettysecrets'){
            price = getPrice($('div.price-box-bundle').find('div.price-box').find('span.price').text());
        }
        else if( website_detected == 'moodsofcloe'){
            price  = getPrice($('p.productPrice').text());
        }
        else if( website_detected == 'koovs'){
            price  = getPrice($('div.product-price').find('strong').text());
        }
        else if( website_detected == 'basicslife'){
            pp = $('div.price-box').find('span.price').text();
            price = getPrice(pp);
        }
        else if( website_detected =='bewakoof'){
            if( $('#xProduct_Price_display').find('span').length > 0 ){
                $('#xProduct_Price_display').find('span').remove();
            }
            pp = $('#xProduct_Price_display').text();
            price = getPrice(pp);
        }
        else if( website_detected == 'fashionara'){
            pp = $('div.price-box').find('span.old-price').text();
            if( $('div.price-box').find('span.special-price').length >  0 ){
                pp = $('div.price-box').find('span.special-price').text();
            }
            price = getPrice(pp);
        }
        else if (website_detected == 'eBay' && window.location.href.indexOf('read.ebay.in') != -1) {
            price = getPrice($('table').
                    find('tr:eq(3)').
                    children('td[rowspan="3"]').
                    find('table:first').
                    find('tr:first').
                    find('td:last').
                    text());
        } else if (website_detected == 'Onemi') {
            $('.product-name').
                    siblings('div').
                    each(function() {
                        if ($(this).
                                children('span').length > 0) {
                            if ($(this).
                                    children('span:first').
                                    text() == 'Price') {
                                price = getPrice($(this).
                                        children('span:last').
                                        text());
                                return 0;
                            }
                        }
                    });
            if (price == 0) {
                if ($('.offer_label_price').length > 0) {
                    price = getPrice($('.offer_label_price:first').
                            text());
                }
            }
        } else if (website_detected == 'Croma') {
            price = getPrice($('.product').
                    find('h2:first').
                    text());
        } else if (website_detected == 'ezeekart') {
            $('.product_view_sprice').
                    children('span').
                    remove();
            price = getPrice($('.product_view_sprice').
                    text());
        } else if (website_detected == 'egully') {
            price = getPrice($('.ProductPrice').
                    text());
        } else if (website_detected == 'grabmore') {
            if ($('#apparel_new_product_page_price_rate1').
                    is(':visible') && $('#apparel_new_product_page_price_rate1').
                    children('.appr_price').
                    is(':visible')) {
                price = getPrice($('#apparel_new_product_page_price_rate1').
                        children('.appr_price').
                        text());
            } else if ($('#apparel_new_product_page_price_rate2').
                    is(':visible') && $('#apparel_new_product_page_price_rate2').
                    children('.appr_price').
                    is(':visible')) {
                price = getPrice($('#apparel_new_product_page_price_rate2').
                        children('.appr_price').
                        text());
            } else if ($('#apparel_new_product_page_price_rate3').
                    is(':visible') && $('#apparel_new_product_page_price_rate3').
                    children('.appr_price').
                    is(':visible')) {
                price = getPrice($('#apparel_new_product_page_price_rate3').
                        children('.appr_price').
                        text());
            }
        } else if (website_detected == 'nykaa') {
            price = getPrice($('#price').
                    text());
        } else if (website_detected == 'cosmetix') {
            price = getPrice($('#opd_final').
                    text());
        } else if (website_detected == 'Letskart') {
            $('.productdisplay_price').
                    each(function() {
                        var p = getPrice($('.productdisplay_price').
                                children('b:first').
                                text());
                        if (p > 0) {
                            price = p;
                            return 0;
                        }

                    });
        } else if (website_detected == 'Indianbooks') {
            $('.price').
                    find('.price-num').
                    each(function() {
                        var p = getPrice($(this).
                                text());
                        if (p > 0) {
                            price = p;
                            return 0;
                        }
                    });
        } else if (website_detected == 'Indiatimes' && $('.offerprice').length > 0) {
            price = getPrice($('.offerprice').first().
                    text());
        } else if (website_detected == 'vijaysales') {
            price = getPrice($('.vspNumber:first').
                    text());
        } else if (website_detected == 'eDabba') {
            price = getPrice($('.offer-price:first').
                    children('.uc-price').
                    text());
        } else if (website_detected == 'greendust') {
            $('.prodprice:first').
                    children('.poff').
                    remove();
            price = getPrice($('.prodprice:first').
                    text());
        } else if (website_detected == 'ShopClues') {
            price = getPrice($('.product-prices').
                    find('.price:last').
                    text());
        } else if (website_detected == 'Naaptol') {
            price = getPrice($('.productDetails').
                    find('meta[itemprop=price]').
                    attr('content'));
        } else if (website_detected == 'shopbychoice') {
            price = getPrice($('.detail-price-raw').
                    find('strong:first').
                    text());
        } else if (website_detected == 'Tradus') {
            price = getPrice($('span[itemprop="lowPrice"]').
                    first().
                    text());
        }
        else if (website_detected == 'amazon' && $('#priceblock_saleprice').length > 0) {
            price = getPrice($('#priceblock_saleprice').text());
        } else if (website_detected == 'amazon' && $('#olp_feature_div').length > 0 && $('#olp_feature_div').text().trim().length > 0) {
            price = getPrice($('#olp_feature_div').find('.a-color-price').text());
        } else if (website_detected == 'amazon' && $('#priceblock_ourprice').length > 0) {
            price = getPrice($('#priceblock_ourprice').text());
        } else if (website_detected == 'amazon' && window.location.href.indexOf('offer-listing') != -1) {
            price = getPrice($('.olpOffer').first().find('.olpOfferPrice').text());
        } else if (website_detected == 'Snapdeal' && window.location.href.indexOf('viewAllSellers') != -1) {
            price = getPrice($('#buyMultiVendorBox').find('.cont').first().find('.redText').first().text());
        } else if (website_detected == 'Flipkart' && $('.prexo-wrap').length > 0) {
            price = getPrice($('.prexo-wrap').find('#tab-0').first().find('.price').first().text());
        }
        else if (website_detected == 'myntra') {
            price = $('div.price').find('span.coupon-offer-launcher').remove();
            $('div.price').find('span.strike').remove();
            $('div.price').find('span.discount').remove();
            price = getPrice($('div.price').text());
        }
        else if (website_detected == 'jabong') {
            price = getPrice($('#price_div').find('span.price').text());
        }else if( website_detected == 'fabindia'){
            price = getPrice($('span.regular-price').find('span.price').text());
        }else if( website_detected == 'zara'){
            price = getPrice($('span.price').attr('data-price'));
        }else if( website_detected == 'bata'){
            price =getPrice($('#inrPrice').attr('value'));
            if( price == '' || price == 0 ){
                price = getPrice($('span.amount').text());
            }
        }else if( website_detected == 'miracas'){
            if( $('#our_price_display').length > 0 ){
                pp = $('#our_price_display').text();
                price = getPrice(pp);
            }
        }else if( website_detected == 'indianroots' || website_detected == 'jaypore'){
           price = 1;
        }

        if (typeof price == 'undefined' || price == 'undefined' || price == false || price.length == 0) {
            price = getPrice(jQuery('.bigBold,span[itemprop=price]').
                    eq(0).
                    text()) || getPrice(jQuery('meta[itemprop=price]').
                    attr('content')) || getPrice(jQuery('span.rsSymbol,span.fk-font-verybig').
                    text()) || getPrice(jQuery('.strk_price_prc span.price,.price .list-price').
                    eq(0).
                    text()) ||
                    getPriceWithPoint(jQuery('#actualPriceValue').
                            eq(0).
                            text()) ||
                    getPriceWithPoint(jQuery('span span.vi-is1-prcp').
                            eq(0).
                            text()) ||
                    getPrice(jQuery('.pro_PriceInfo strong,.price-current,[itemprop=price],#product_price').
                            eq(0).
                            text()) ||
                    getPrice(jQuery('.our_price,.columright .price .uc-price,.price-box .price,.red16').
                            eq(0).
                            text()) ||
                    getPriceWithPoint(jQuery('.WebRupee').
                            parent().
                            eq(1).
                            text()) || // reliencedigital.in
                    getPrice(jQuery('.product-prices p .price,.offer_price,.detail-price-raw,.sale label').
                            eq(0).
                            text()) || // different cases of shopclues 
                    getPriceWithPoint(jQuery('#v4-27,.final-price,.offer_label_price').
                            eq(0).
                            text()) || // different cases of Ebay.in 
                    jQuery('#our_price_display').
                    eq(0).
                    text().
                    replace(/[^\d.-]/g, '') // http://adexmart.com/;  
                    || getPrice(jQuery('.infiPrice').
                            eq(0).
                            text());
            if (price == 'undefined' || price.length == 0 || price == 0) {
//shopclues
                price = getPrice(jQuery('.price').
                        find('.price').
                        text());
            }

            if (price == 'undefined' || price.length == 0 || price == 0) {
                price = getPriceWithPoint(jQuery('.price:first').
                        text());
            }

            if (website_detected == 'Letshop') {
                if (jQuery('.listing-type-list').length > 1) {
                    price = '';
                }
            } else if (website_detected == 'amazon') {
                if (jQuery('.fstRowGrid').length > 1) {
                    price = '';
                }
            } else if (website_detected == 'Homeshop') {
                if (jQuery('div.product_div').length > 1) {
                    price = '';
                }
            } else if (website_detected == 'ManiacStore') {
                if (jQuery('div.products-list').
                        find('ul li').length > 1) { // for maniacstore
                    price = '';
                }
            } else if (website_detected == 'Onemi') {
                if (jQuery('li.item').length > 1) { // for onemi
                    price = '';
                }
            } else if (website_detected == 'Infibeam') {
                if (jQuery('div.boxinner').
                        find('li').length > 1 || jQuery('div.boxinnerbig').
                        find('li').length > 1) {
                    price = '';
                }
            } else if (website_detected == 'MirchiMart') {
                if (jQuery('.proBigBox').length > 1) { // for onemi
                    price = '';
                }
            }
        }

        return price;
    }
    function getPageBreadCrumbs(){
        var ret = [];  
        if( website_detected == 'amazon'){
            if( $('#wayfinding-breadcrumbs_feature_div').find('.a-list-item').find('a.a-link-normal').length > 0 ){
                $('#wayfinding-breadcrumbs_feature_div').find('.a-list-item').find('a.a-link-normal').each(function(){
                   var bb_crumb = $(this).text();
                   ret.push( bb_crumb.trim());
                });
            }
        }
        else if( website_detected == 'snapdeal' || website_detected == 'Snapdeal' ){
            if( $('#breadCrumbWrapper').find('a.bCrumbOmniTrack').find('span').length > 0 ){
                $('#breadCrumbWrapper').find('a.bCrumbOmniTrack').find('span').each(function(){
                   var bb_crumb = $(this).text();
                   ret.push( bb_crumb.trim());
                });
            }
        }
        else if( website_detected == 'Flipkart' || website_detected == 'flipkart' ){
            if( $('div.clp-breadcrumb').find('ul').find('li').find('a').length > 0 ){
                $('div.clp-breadcrumb').find('ul').find('li').find('a').each(function(){
                   var bb_crumb = $(this).text();
                   ret.push( bb_crumb.trim());
                });
            }
        }
        else if (website_detected == 'acadzone' || website_detected == 'Bookadda') {
        }
        else if (website_detected == 'Tradus') {
            if (jQuery('#breadcrumb').length > 0) {
                jQuery('#breadcrumb').children('li').each(function(i) {
                    var hrf = jQuery(this).children('a').attr("href");
                    if (hrf) {
                        var txt = jQuery(this).text();
                        ret.push(txt);
                    }
                });
            }
        }
        else if (website_detected == 'Homeshop') {
            $('.breadcrumb').children('li').each(function() {
                ret.push($(this).children('a').text());
            });
        }
        else if (website_detected == 'jabong') {
            $('.breadcrumbs').children('a.fs11').each(function() {
                bcrumb = $(this).text();
                bcrumb = bcrumb.trim();
                ret.push(bcrumb);
            });
        }
        else if (website_detected == 'Indiatimes') {
            $('.navigation').children('a').each(function() {
                bcrumb = $(this).text();
                bcrumb = bcrumb.trim();
                ret.push(bcrumb);
            });
        }
        else if (website_detected == 'ibhejo') {
            $('#location').children('a.bread-crumb').each(function() {
                bcrumb = $(this).text();
                bcrumb = bcrumb.trim();
                ret.push(bcrumb);
            });
        }
        else if (website_detected == 'Next') {
            $('.ish-breadcrumbs-list-item-link').each(function() {
                bcrumb = $(this).text();
                bcrumb = bcrumb.trim();
                ret.push(bcrumb);
            });
        }
        else {
            if (jQuery('a[itemprop="url"]').length > 0) {
                jQuery('a[itemprop="url"]').
                        each(function(i) {
                            var hrf = jQuery(this).
                                    attr("href");
                            if (hrf) {
                                var txt = jQuery(this).
                                        text();
                                ret.push(txt);
                            }
                        });
            }
            else if (jQuery('[itemprop="breadcrumb"]').find('a').length > 1) {
                jQuery('[itemprop="breadcrumb"]').find('a').
                        each(function() {
                            var txt = $(this).text();
                            ret.push(txt);
                        });
            }
            else if (jQuery('[itemprop="breadcrumb"]').length > 0) {
                jQuery('[itemprop="breadcrumb"]').
                        each(function() {
                            var txt = $(this).
                                    find('a:first')
                                    text();
                            ret.push(txt);
                        });
            }
            else {
                jQuery('.bradCrumbDiv,.breadcrumb,.bread-crumb,.fk-lbreadbcrumb,.breadcrumbs,#breadcrumb,.bbc-in,[itemtype="http://schema.org/WebPage"],.crumb_outer,.bread-crumbs,[itemprop="breadcrumb"],#browse-nodes,.breadcrum,#product-breadcrumbs,#pagenav .navigation,.breadcrumlnk,#do_categories_chain_main_container,.sc-breadbcrumb,.bread_spacing,#browse_nodes_bc,.detail-breadcrumb').
                        find('a').
                        each(function(
                                i) {
                            var hrf = jQuery(this).
                                    attr("href");
                            if (hrf) {
                                var txt = jQuery(this).
                                        text();
                                ret.push(txt);
                            }
                        });
            }
        }
        return ret;
    }
    
    function getPrice(price) {
        return getPriceWithPoint(price);
    }
    function getColorArray(){
        var colors = [];
        if ( website_detected == 'bewakoof') {
            if( $('div.xcolor_lable').length > 0 ){
                c = $('div.xcolor_lable').text();
                c = stringToArray( c,':');
                if( c.length == 2 ){
                    colors.push(c[1].trim());
                }
            }
        }
        else if ( website_detected == 'zivame') {
            if( $('ul.product_colors').find('img.colorswatch').length > 0 ){
                c = $('ul.product_colors').find('img.colorswatch').attr('alt');
                c = c.trim();
                if( c.length > 0 ){
                    colors.push(c);
                }
            }
        }
        else if ( website_detected == 'elitify') {
            if( $('ul.color').find('li.color').length > 0 ){
                $('ul.color').find('li.color').each(function(){
                    c = $(this).attr('data-option-title');
                    c = c.trim();
                    if( c.length > 0 ){
                        colors.push(c);
                    }
                });
            }
        }
        return colors;
    }
    function getStockStatus(){
        var stock = 1;
        if( website_detected == 'amazon'){
            if( $('div#outOfStock').length > 0 ){
                stock = 0;
            }
        }
        else if( website_detected == 'Flipkart'){
            if( $('div.out-of-stock-section').length > 0 ){
                stock = 0;
            }
        }
        return stock;
    }
    // For http://www.amazon.in/
    function getPriceWithPoint(price) {
        if (price) {
            price = price.replace(/[^\d.]/g, '');
            //        price = price.replace(/[.]/, '');

            if (price.indexOf('.') == 0) {
                price = price.replace('.', '');
            }

            return price;
        } else {
            return '';
        }
    }
    function getISBN() {
        var x;
        var isbn = '';
        if (website_detected == 'amazon') {
            isbn = jQuery("b:contains('ISBN-13')").parents('li').text();
            isbn = isbn.replace(/-/g, '');
            isbn = pickISBN(isbn);
        }
        if (website_detected == 'acadzone') {
            isbn = jQuery("td:contains('ISBN-13')").next('td').text();
            isbn = pickISBN(isbn);
        }
        if (website_detected == 'Crossword') {
            isbn = jQuery("label:contains('ISBN-13')").parents('li').text();
            isbn = pickISBN(isbn);
        }
        if (website_detected == 'Rediff') {
            if (location.hostname == 'books.rediff.com') {
                isbn = jQuery("title").text();
                isbn = pickISBN(isbn);
            }
        }

        if (website_detected == 'ShopClues') {
            //shopclues 
            var shopclues = '';
            $('.form-field label').each(function() {
                var h = $(this).html();
                if (h.match(/isbn/i)) {
                    var html = $(this).parent().html();
                    if (isbn.length == 0)
                        isbn = pickISBN(html);
                }

            });
        }

        if (website_detected == 'Indianbooks') {
            $('.form-field label').each(function() {
                var h = $(this).html();
                if (h.match(/isbn/i)) {
                    var html = $(this).parent().html();
                    if (isbn.length == 0)
                        isbn = pickISBN(html);
                }

            });
        }

        if (website_detected == 'Crossword') {
            return pickISBN(windowURL);
        }

        if (website_detected == 'Indiatimes') {
            $('.productspecification').find('tr').each(function() {
                if ($(this).children('th').text().match(/isbn/i)) {
                    var html = $(this).children('td').text();
                    if (isbn.length == 0)
                        isbn = pickISBN(html);
                }
            });
        }

        if (website_detected == 'eBay') {
            $('tr').each(function() {
                if ($(this).children('td').text().match(/isbn/i)) {
                    var html = $(this).children('td').text();
                    if (isbn.length == 0)
                        isbn = pickISBN(html);
                }
            });
        }

        if (website_detected == 'Infibeam') {
            $('h2.simple').each(function() {
                var text = $(this).text();
                if (validateNumaric(text)) {
                    isbn = text;
                }
            });
        }

        if (website_detected == 'Snapdeal') {
            $('.key-features').children('li').each(function() {
                if (isbn.length == 0) {
                    isbn = pickISBN($(this).text());
                }
            });
        }

        if (website_detected == 'Shopsite') {
            $('#features').find('li').each(function() {
                if (isbn.length == 0) {
                    isbn = pickISBN($(this).text());
                }
            });
        }


        var currentText13 = "td:contains('ISBN-13'),td:contains('ISBN-13'),label:contains('ISBN-13'),li:contains('ISBN-13')";
        var currentText14 = "td:contains('ISBN 13'),td:contains('ISBN 13'),label:contains('ISBN 13'),li:contains('ISBN 13')";
        var currentText = "td:contains('ISBN'),li:contains('ISBN'),span:contains('ISBN'),label:contains('ISBN'),li:contains('ISBN')";

        if (x = validateNumaric(isbn)) {
            return x;
            // containts depriciated
        } else if (x = validateNumaric(jQuery(currentText13).first().text())) {
            return x;
        } else if (x = validateNumaric(jQuery(currentText13).next().text())) {
            return x;
        } else if (x = validateNumaric(jQuery(currentText14).first().text())) {
            return x;
        } else if (x = validateNumaric(jQuery(currentText14).next().text())) {
            return x;
        } else if (x = validateNumaric(jQuery(currentText).first().text())) {
            return x;
        } else if (x = validateNumaric(jQuery(currentText).next().text())) {
            return x;
        } else {
            return false;
        }
    }
    function pickISBN(text) {
        var r = text.match(/[\d]{13}/);
        if (r != null && r[0] && r[0] != 'undefined') {
            r = r[0];
            if (r.length > 0) {
                return r;
            }
        }
        return '';
    }
    function validateNumaric(x) {
        x = x.replace(/[^\d]/g, '');
        var ln = x.toString().length;
        if (!isNaN(x) && ln == 13) {
            x = x.replace(/^13/, '');
            return x;
        } else {
            return false;
        }
    }
    function getTextBetween( start, end, string ){
        var start_pos = string.indexOf(start) + start.length;
        var end_pos = string.indexOf(end,start_pos);
        var text_to_get = string.substring( start_pos,end_pos )
        return text_to_get;
    }
    function getImages() {
        var main_image = '';
        var more_images = [];
        
        if (website_detected == 'elitify') {
            if( $('meta[property="og:image"]').length > 0 ){
                more_images.push( $('meta[property="og:image"]').attr('content'));
            }
            if( more_images.length > 0 ){
                main_image = more_images[0];
            }
        } 
        else if (website_detected == 'zara') {
            if ($('img.image-big').length > 0) {
                $('img.image-big').each(function() {
                    var img = $(this).attr('data-src');
                    img = img.replace("//",'');
                    img = 'http://'+img;
                    more_images.push(img);
                });
            }
            if( more_images.length > 0 ){
                main_image = more_images[0];
            }
        } 
        else if (website_detected == 'fabindia') {
            if ($('div.MagicToolboxContainer').find('a').find('img').length > 0) {
                $('div.MagicToolboxContainer').find('a').each(function() {
                    var img = $(this).attr('href');
                    more_images.push(img);
                });
            }
            if( more_images.length > 0 ){
                main_image = more_images[0];
            }
        } 
        else if (website_detected == 'faballey') {
            if ($('div.mt-more-images').find('img.sliderimage').length > 0) {
                $('div.mt-more-images').find('img.sliderimage').each(function() {
                    var img = $(this).attr('src');
                    more_images.push(img);
                });
            }
            if( more_images.length > 0 ){
                main_image = more_images[0];
            }
        } 
        else if (website_detected == 'forever21') {
            if ($('ul#scroller').find('li').find('img').length > 0) {
                $('ul#scroller').find('li').find('img').each(function() {
                    var small_img = $(this).attr('src');
                    if( small_img.indexOf('_58') != -1 ){
                        small_img = small_img.replace("_58", "_330");
                        more_images.push(small_img);
                    }
                });
            }
            if( more_images.length > 0 ){
                main_image = more_images[0];
            }
        } 
        else if (website_detected == 'Flipkart') {
            if ($('img.productImage').length > 0) {
                main_image = $('img.productImage').attr("data-src");
            }
            if ($('div.productImages').find('img.productImage').length > 0) {
                $('div.productImages').find('img.productImage').each(function() {
                    more_images.push($(this).attr('data-zoomimage'));
                });
            }
        } 
        else if (website_detected == 'amazon') {
            
            if ($('img#landingImage').length > 0) {
                main_image = $('img#landingImage').attr('data-old-hires');
            }
            try{
                var amazon_raw = getTextBetween( '[{"hiRes"','}]',pageHTML );
                amazon_raw_json = '[{"hiRes"'+amazon_raw+'}]';
                json_data = JSON.parse(amazon_raw_json);
                if( json_data.length > 0 ){
                    for( var i = 0; i < json_data.length; i++ ){
                        more_img = json_data[i].large;
                        if( typeof more_img != 'undefined' && more_img != '' && more_img != null && more_img != 'null'){
                            more_images.push(json_data[i].large);
                        }
                    }
                }
                if( more_images.length > 0 ){
                    main_image  = more_images[0];
                }
                
            }catch(e){
                console.log(e);
                console.log('!!! check amazon more images catch line 1054 !!!');
                if ($('div#altImages').find('li.item').length > 0) {
                    $('div#altImages').find('li.item').each(function() {
                        more_images.push($(this).find('img').attr('src'));
                    });
                }
            }
        } 
        else if (website_detected == 'basicslife') {
            if ($('div.product-img-box').find('a.MagicZoomPlus').length > 0) {
                main_image = $('div.product-img-box').find('a.MagicZoomPlus').attr('href');
            }
            if ($('div.product-img-box').find('div.more-views').find('li').length > 0) {
                $('div.product-img-box').find('div.more-views').find('li').each(function() {
                    more_images.push($(this).find('a').attr('href'));
                });
            }
        }
        else if (website_detected == 'bewakoof') {
            if ( $('img#main_image').length > 0 ) {
                main_image = $('img#main_image').attr('src');
            }
            if( $('div#xcontent_product_row1_col1').find('img').length > 0 ){
                $('div#xcontent_product_row1_col1').find('img').each(function(){
                    var ii = $(this).attr('src');
                    if( ii.indexOf('thumbs96_108') != -1 ){
                        ii = ii.replace('thumbs96_108','thumbs480_540');
                    }
                    if( ii != '' && ii != null){
                        more_images.push(ii);
                    }
                });
            }
        }
        else if (website_detected == 'fashionara') {
            if ( $('div.product-img-box').find('div.product-img').children('img').length > 0 ) {
                main_image = $('div.product-img-box').find('div.product-img').children('img').attr('src');
            }
            if( $('div#more_views').find('ul#thumbs-slide li').length > 0 ){
                $('div#more_views').find('ul#thumbs-slide li').each(function(){
                    more_images.push($(this).find('a').attr('data-image'));
                });
            }
        }
        else if (website_detected == 'jabong'){
            if( $('div#onpage-productZoom').length > 0 ){
                main_image = $('div#onpage-productZoom').attr('data-zoom-image');
            }
            if( $('div#prdthumb').find('div.thumb-slider').find('span').length > 0 ){
                $('div#prdthumb').find('div.thumb-slider').find('span').each(function(){
                    more_images.push($(this).attr('data-image-big'));
                });
            }
        }
        else if (website_detected == 'koovs'){
            if( $('img#finalimage').length > 0 ){
                main_image = $('img#finalimage').attr('src');
            }
            if( $('div.sub_image').find('ul.thumb-views').find('li').length > 0 ){
                $('div.sub_image').find('ul.thumb-views').find('li').each(function(){
                    var mi = $(this).find('a').attr('rel');
                    mi = mi.replace(/"/gi,'');
                    mi_explode = stringToArray(mi,',');
                    for( var i = 0; i< mi_explode.length;i++){
                        mi_1 = mi_explode[i];
                        if( mi_1.indexOf('prodimage') != -1){
                            mi_1_explode = stringToArray(mi_1,':');
                            mi_1_explode[2] = mi_1_explode[2].replace('//','');
                            more_images.push( 'http://'+mi_1_explode[2]);
                        }
                    }
                });
            }
        }
        else if (website_detected == 'moodsofcloe'){
            if( $('div.zImg').find('a').length > 0 ){
                main_image = $('div.zImg').find('a').attr('href');
            }
            if( $('ul#thumblist').find('li').length > 0){
                $('ul#thumblist').find('li').each(function(){
                    var mi = $(this).find('a').attr('rel');
                    mi = mi.replace(/'/gi,'');
                    mi = mi.replace(/{/gi,'');
                    mi = mi.replace(/}/gi,'');
                    mi_explode = stringToArray(mi,',');
                    for( var i = 0;i<mi_explode.length;i++){
                        mi_1_explode = stringToArray(mi_explode[i],':');
                        if( mi_1_explode[0] == 'largeimage'){
                            mi_1_explode[2] = mi_1_explode[2].replace('//','');
                            more_images.push(mi_1_explode[2]);
                        }
                    }
                });
            }
        }
         else if (website_detected == 'myntra') {
            if ( $('div.images').find('div.blowup').children('img').length > 0 ) {
                main_image = $('div.images').find('div.blowup').children('img').attr('src');
            }
            if( $('div.images').find('div.thumbs img').length > 0 ){
                $('div.images').find('div.thumbs img').each(function(){
                    more_images.push($(this).attr('data-blowup'));
                });
            }
        }
         else if (website_detected == 'prettysecrets') {
            if ( $('div#product-media').find('a.primary').length > 0 ) {
                main_image =  $('div#product-media').find('a.primary').attr('href');
            }
            if( $('div#product-media').find('ul.more-views').find('li').length > 0 ){
                $('div#product-media').find('ul.more-views').find('li').each(function(){
                    more_images.push($(this).find('a').attr('href'));
                });
            }
        }
        else if (website_detected == 'shopnineteen') {
            if ( $('div.product-img-box').find('p.product-image:first').find('a').length > 0 ) {
                main_image =  $('div.product-img-box').find('p.product-image:first').find('a').attr('href');
            }
            if( $('div.product-img-box').find('p.product-image').find('a').length > 0 ){
                $('div.product-img-box').find('p.product-image').find('a').each(function(){
                    more_images.push($(this).attr('href'));
                });
            }
        }
        else if (website_detected == 'Snapdeal') {
            if ( $('div.product-main-image').find('img.jqzoom').length > 0 ) {
                main_image =  $('div.product-main-image').find('img.jqzoom').attr('src');
            }
            if( $('ul#product-slider').find('li').length > 0 ){
                $('ul#product-slider').find('li').each(function(){
                    chkImage = $(this).find('img').attr('src');
                    if( chkImage == '' || chkImage == null ){
                        chkImage = $(this).find('img').attr('lazysrc');
                    }
                    more_images.push(chkImage);
                });
            }
        }
         else if (website_detected == 'yepme') {
            if ( $('div#productImage').find('a').length > 0 ) {
                main_image =  $('div#productImage').find('a').attr('href');
            }
            if( $('div#productimages_heroes').find('li a').length > 0 ){
                $('div#productimages_heroes').find('li a').each(function(){
                    chkImage = $(this).attr('rel');
                    if( chkImage.length > 0 ){
                        chkImage = chkImage.replace(/{/gi, '');
                        chkImage = chkImage.replace(/}/gi, '');
                        chkImage = stringToArray(chkImage,',');
                        for( var i = 0; i<chkImage.length ; i++){
                            cii = stringToArray( chkImage[i] , ':');
                            if( cii[0] == 'largeimage'){
                                moreImage = cii[2];
                                moreImage = moreImage.replace('//', '');
                                moreImage = moreImage.replace("'", '');
                                more_images.push(moreImage);
                            }
                        }
                    }
                });
            }
        }
        else if (website_detected == 'zivame') {
            main_image = $('div.proImg').find('img').attr('pagespeed_lazy_src');
            if( main_image == '' || main_image == null ){
                main_image = $('div.proImg').find('img').attr('src');
            }
            if( $('ul#links').find('li').length > 0 ){
                $('ul#links').find('li').each(function(){
                    moreImages_1 = $(this).find('img').attr('pagespeed_lazy_src');
                    if( moreImages_1 == '' || moreImages_1 == null){
                        moreImages_1 = $(this).find('img').attr('src');
                    }
                    more_images.push(moreImages_1);
                });
            }
        }
        else if( website_detected == 'zovi'){
            zovi_json = extractJsonData( website_detected,$ );
            if( zovi_json != false  ){
                zovi_more_images = zovi_json.thumbs;
                for( var i = 0; i<zovi_more_images.length;i++ ){
                    var ii = zovi_more_images[i];
                    var iii = 'http://c2.zovi.com/bd1/g/p/11283806801/'+ii+'_d.jpg';
                    if( main_image == ''){
                        main_image = iii;
                    }
                    more_images.push(iii);
                }
           }
        }
        else if( website_detected == 'trendin'){
            main_image = $('#product_image').find('a.jqzoom').find('img').attr('src');
            if( $('#thumblist').find('li').length > 0 ){
                $('#thumblist').find('li').each(function(){
                    ii = $(this).find('img').attr('src');
                    more_images.push(ii);
                });
            }
        }
        else if( website_detected == 'fabfurnish'){
            if( $('ul#productThumbImg').find('li a').length > 0 ){
                $('ul#productThumbImg').find('li a').each(function(){
                    chkImage = $(this).find('img').attr('longdesc');
                    more_images.push(chkImage);
                    if( main_image == ''){
                        main_image = chkImage;
                    }
                });
            }
        }
        else if( website_detected == 'zansaar'){
            if($('span#zoom1').length > 0){
                main_image = $('span#zoom1').attr('href');
            }
            if( $('ul#product_more_images').find('li').length > 0 ){
                $('ul#product_more_images').find('li').each(function(){
                    chkImage = $(this).find('span.thumbnail').attr('href');
                    more_images.push(chkImage);
                });
            }
        }
        else if( website_detected == 'shoppersstop'){
            if( $('a#cloudZoom').length > 0 ){
                main_image =  $('a#cloudZoom').attr('href');
            }
            if( $('div.prodImgBox').find('div.prodThumbV').find('a.cloud-zoom-gallery').length > 0 ){
                $('div.prodImgBox').find('div.prodThumbV').find('a.cloud-zoom-gallery').each(function(){
                    ii = $(this).attr('href');
                    more_images.push(ii);
                });
            }
        }
        else if( website_detected == 'urbanladder'){
            if( $('ul.slider').find('li').length > 0 ){
                main_image =  $('ul.slider').find('li:first').find('img').attr('src');
                $('ul.slider:first').find('li').each(function(){
                    ii = $(this).find('img').attr('data-src');
                    if( typeof ii != 'undefined' && ii != '' && ii != null){
                        if( ii.indexOf('//') != -1 ){
                            ii = ii.replace('//','http://');
                        }
                        more_images.push(ii);
                    }
                });
            }
        }else if( website_detected == 'Pepperfry'){
            if( $('.vip_large_img').find('img').length >  0){
                main_image = $('.vip_large_img').find('img').attr('src');
            }
            if( $('div.vip_thumbs_scroller').find('.sofa_thumb_scroll').find('a').length > 0 ){
                $('div.vip_thumbs_scroller').find('.sofa_thumb_scroll').find('a').each(function(){
                    ii = $(this).attr('href');
                    more_images.push(ii);
                });
            }
        }else if( website_detected == 'bata'){
            if($('div.small-list-all').find('li').find('img.productImg').length > 0 ){
                $('div.small-list-all').find('li').find('img.productImg').each(function(){
                    var ii = $(this).attr('src');
                    more_images.push(ii);
                });
                if( more_images.length > 0 ){
                    main_image == more_images[0];
                }
            }
        }else if (website_detected == 'miracas') {
            if ( $('div#image-block').find('img').length > 0 ) {
                main_image =  $('div#image-block').find('img').attr('src');
            }
            if( $('div#thumbs_list').find('a.thickbox').length > 0 ){
                $('div#thumbs_list').find('a.thickbox').each(function(){
                    more_images.push($(this).attr('href'));
                });
            }
        }else if (website_detected == 'indianroots') {
            if ( $('a#cloud_zoom').length > 0 ) {
                main_image =  $('a#cloud_zoom').attr('href');
            }
            if( $('ul#mycarousel').find('a.cloud-zoom-gallery').find('img').length > 0 ){
                 $('ul#mycarousel').find('a.cloud-zoom-gallery').find('img').each(function(){
                    var aa = $(this).attr('src');
                    if( typeof aa != 'undefined'){
                        aa = aa.replace('thumbnail/94x106','image/435x489');
                        more_images.push(aa);
                    }
                });
            }
        }else if( website_detected == 'jaypore'){
            if( $('div#prdThumbs').find('img').length > 0 ){
                $('div#prdThumbs').find('img').each(function(){
                    var aa = $(this).attr('data-zoom');
                    if( typeof aa != 'undefined'){
                        more_images.push(aa);
                    }
                });
                if( more_images.length > 0 ){
                    main_image == more_images[0];
                }
            }
        }
        return {
            'main_image': main_image,
            'more_images': more_images
        }
    }
    function getOffers(){
        var offers = [];
        if (website_detected == 'Flipkart' || website_detected == 'flipkart') {
            if( $('.offers-info-wrap').find('.offers').find('li.offer').length > 0 ){
                $('.offers-info-wrap').find('.offers').find('li.offer').each(function(){
                    var offer_text = $(this).find('span.offer-text').text();
                    if( typeof offer_text != 'undefined' && offer_text.length > 0 ){
                        offers.push( offer_text.trim());
                    }
                });
            }
        }
        else if (website_detected == 'snapdeal' || website_detected == 'Snapdeal') {
            if( $('div.ClsModalOfferInner').find('div.ClsPromoRow').length > 0 ){
                $('div.ClsModalOfferInner').find('div.ClsPromoRow').each(function(){
                    var offer_text = '';
                    if( $(this).find('span.ClsPromoCode').length > 0 ){
                        offer_text += $(this).find('span.ClsPromoCode').text();
                    }
                    if( $(this).find('span.ClsPromoCaption').length > 0 ){
                        offer_text += $(this).find('span.ClsPromoCaption').text();
                    }
                    if( offer_text.length > 0 ){
                        offer_text = offer_text.replace(/[\n\r\t]/g,'');
                        offers.push( offer_text.trim());
                    }
                });
            }
        }
        return offers;
    }
    function getDeliveryCharges(){
        var ret  = '';
        if (website_detected == 'Flipkart' || website_detected == 'flipkart') {
            if( $('div.default-shipping-charge').length > 0 ){
                $('div.default-shipping-charge').find('.delivery-charge-help-ico').remove();
                $('div.default-shipping-charge').find('.delivery-charge-help-text').remove();
                ret = $('div.default-shipping-charge').text();
            }
        }
        else if (website_detected == 'snapdeal' || website_detected == 'Snapdeal') {
             if( $('#Ship_charges').length > 0 ){
                 ret = $('#Ship_charges').text();
                 ret = ret.replace(/[\n\r\t]/g,'');
            }
        }
        return ret.trim();
    }
    function getLastSlash(url) {
        if (typeof url == "undefined" || !url)
            return;
        url = url.split('/');
        url = url[url.length - 1];
        return url;
    }
    function getHTML(url, actMobile, callback) {
        var headers = {
            //"accept-charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
            //"accept-language": "en-US,en;q=0.8",
            //"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2",
            //"accept-encoding": "gzip,deflate",
        };
        if (actMobile) {
            headers['user-agent'] = 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7';
        }
        var ret = urlMod.parse(url);
        if (url.indexOf('jabong') != -1) {
            headers['X-Requested-With'] = 'XMLHttpRequest';
        }
        if(website_detected == 'paytm'){
            url = 'https://catalog.paytm.com/v1/p/'+getLastSlash(url);
        }
        if( url.indexOf('fabindia') != -1 ){
              headers['Cookie'] = '_we_wk_ss_lsf_=true; external_no_cache=1; frontend=be584b4464d789a49bfa17d1da6e371b; sub_cookie_page=50; __utma=33308457.168459215.1427283275.1427434183.1427438273.4; __utmb=33308457.11.10.1427438273; __utmc=33308457; __utmz=33308457.1427434183.3.2.utmcsr=pricegenie.co|utmccn=(referral)|utmcmd=referral|utmcct=/dev/admin/admin/stats-website-catalog-urls.php; my_fab_store=ind';
            }
        
        var options = {
            url: url,
            headers: headers
        };
        var req = request.get(options);
        req.on('response', function(res) {
            var chunks = [];
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });
            res.on('end', function() {
                var buffer = Buffer.concat(chunks);
                var encoding = res.headers['content-encoding'];
                if (encoding == 'gzip') {
                    zlib.gunzip(buffer, function(err, decoded) {
                        callback(err, decoded && decoded.toString());
                    });
                } else if (encoding == 'deflate') {
                    zlib.inflate(buffer, function(err, decoded) {
                        callback(err, decoded && decoded.toString());
                    })
                } else {
                    callback(null, buffer.toString());
                }
            });
        });
        req.on('error', function(err) {
            callback(err);
        });
    }
    
    function processUrl(template, website_detected, url,urlsource,data, cat_id, callback) {
        var adminEmailAlert = '';
        pageHTML = template;
        if (typeof data == "undefined") {
            data = false;
        }
        jsdom.env({
            html: template,
            src: [jquery],
            SkipExternalResources: ['img', 'css'],
            done: function(errors, w) {
                jQuery = w.$;
                $ = w.$;
                window = w;
                colors = [];
                var offers = [];
                var bread_crumbs = [];
                var shipping_charges = 0;
                var delivery_charge = '';
                if( website_detected == 'paytm'){
                    json_data = JSON.parse(template);
                    var price = json_data.offer_price;
                    if( price == '' || price == 0 ){
                        price = json_data.actual_price;
                    }
                    var name = json_data.name;
                    var main_image = json_data.image_url;
                    var more_images = json_data.other_images;
                    var stock = 1;
                    more_images.push(main_image);
                    if( typeof json_data.promo_text != 'undefined' && json_data.promo_text != ''){
                        offers.push(json_data.promo_text);
                    }
                    if( typeof json_data.ancestors != 'undefined' && json_data.ancestors.length > 0  ){
                        for( var i =0; i<json_data.ancestors.length;i++){
                            if( typeof json_data.ancestors[i].name != 'undefined'){
                                bread_crumbs.push( json_data.ancestors[i].name);
                            }
                        }
                    }
                }
                else if( website_detected == 'myntra'){
                    json_data = JSON.parse(template);
                    json_data = json_data.data;
                    var price = json_data.discountedPrice;
                    if( price == '' || price == 0 ){
                        price = json_data.price;
                    }
                    var name = json_data.productDisplayName;
                    var main_image = '';
                    if( typeof json_data.styleImages.default.imageURL != 'undefined'){
                        main_image = json_data.styleImages.default.imageURL;
                    }
                    var more_images = [];
                    if( typeof json_data.styleImages.default.imageURL != 'undefined'){
                        more_images.push( json_data.styleImages.default.imageURL );
                    }
                    if( typeof json_data.styleImages.search.imageURL != 'undefined'){
                        more_images.push( json_data.styleImages.search.imageURL );
                    }
                    if( typeof json_data.styleImages.back.imageURL != 'undefined'){
                        more_images.push( json_data.styleImages.back.imageURL );
                    }
                    if( typeof json_data.styleImages.left.imageURL != 'undefined'){
                        more_images.push( json_data.styleImages.left.imageURL );
                    }
                    if( typeof json_data.styleImages.front.imageURL != 'undefined'){
                        more_images.push( json_data.styleImages.front.imageURL );
                    }
                    if( typeof json_data.styleImages.right.imageURL != 'undefined'){
                        more_images.push( json_data.styleImages.right.imageURL );
                    }
                    var stock = 1;
                }
                else if( website_detected == 'indiacircus'){
                    json_data = JSON.parse(template);
                    var price = json_data.finalPrice;
                    if( price == '' || price == 0 ){
                        price = json_data.price;
                    }
                    var name = json_data.name;
                    var main_image = '';
                    if( typeof json_data.thumbnail.url != 'undefined'){
                        main_image = json_data.thumbnail.url;
                    }
                    var more_images = [];
                    var stock = 0;
                    if( typeof json_data.inStock != 'undefined' && json_data.inStock == true ){
                        stock = 1;
                    }
                    more_images.push(main_image);
                     if( typeof json_data.images != 'undefined'){
                         for( var i =0; i < json_data.images.length ;i++){
                             more_images.push(json_data.images[i].url);
                         }
                    }
                }
                else{
                    var price = getPriceHtml();
                    var name = getNameHtml();
                    var images = getImages();
                    var main_image = images.main_image;
                    var more_images = images.more_images;
                    var stock = getStockStatus();
                    bread_crumbs = getPageBreadCrumbs();
                    colors = getColorArray();
                    offers = getOffers();
                    delivery_charge = getDeliveryCharges();
                    console.log('colors found');
                    console.log(colors);
                    if( pid != false && colors.length > 0 ){
                        console.log(pid);
                        console.log(colors);
                        where_rec = {
                            '_id': mongoose.Types.ObjectId(pid),
                        };
                        var to_be_update_data = {};
                        to_be_update_data['$set'] = {
                            color: colors,
                            color_update_from:'parseurl.js'
                        };
//                        scrap_data.update(where_rec,to_be_update_data,function(err,dd){
//                            if (err) {
//                                console.log("error on  updating product");
//                                console.log(err);
//                            }else{
//                                console.log('color update done!');
//                            }
//                        });
                        
                    }
                }
                
                var isbn = '';
                if (cat_id == 9) {
                    isbn = getISBN();
                    console.log('isbn found to be ' + isbn);
                }

                console.log('price found to be ' + price);
                console.log('name found to be ' + name);
                
                if( stock == 1 ){
                    console.log('!!! In STOCK Product !!!');
                    if( typeof price == 'undefined' || price == '' || price == 0 ){
                        adminEmailAlert += ' price found :: '+price+'<br>';
                    }
                    if( typeof name == 'undefined' || name == '' ){
                        adminEmailAlert += ' name not found <br>';
                    }
                }else{
                    console.log('!!! Out Of STOCK Product !!!');
                }
                
                if( adminEmailAlert != ''){
                    console.log("!!! parseurl_checklist updated with new data !!!!");
                    var parseurl_checklist = req.conn_parseurl_checklist;
                    var parseurl_checklist_data = new parseurl_checklist({
                        "insert_time":Math.round(+new Date()/1000),
                        "insert_dt":Date(),
                        "pid":pid,
                        "urlsource":urlsource,
                        "website_detected":website_detected,
                        "url":url,
                        "message":adminEmailAlert
                    });
                    parseurl_checklist_data.save(function (err) {
                        if (err) {
                            console.log('err while updating parseurl_checklist');
                        } else {
                        }
                    });
                    //adminEmailAlert += '<hr>';
                    //adminEmailAlert += 'url source : '+urlsource+'<br>';
                    //adminEmailAlert += 'website :: '+website_detected+'<br>';
                    //adminEmailAlert += 'url :: '+url+'<br>';
                    //var alertSubject = 'Product Parse Error : '+'Fashioniq : ' + website_detected;
                    //var alertMsgData = {
                       // subject:alertSubject,
                        //body:adminEmailAlert,
                    //};
                    //req.mailer.send('arun@excellencetechnologies.in',alertSubject,'template',alertMsgData);
                }
                
                if (data) {
                    data.set('price_found', price);
                    data.set('name_found', name);
                    data.set('isbn_found', isbn);
                    data.set('title_found', $('title').html());
                    

                    data.set('notify', 1);
                    data.set('notify_type', 'user');
                    data.set('done', 1);
                    //                data.set('html','');
                    // to check later html is required.
                    //                data.set('done_time',new Date().getTime());
                    data.set('update_from', 'nodejs');
                    data.save(function() {
                        startChecking();
                    });
                } else {
                    callback({
                        price: price,
                        name: name,
                        isbn: isbn,
                        title: $('title').html(),
                        image:main_image,
                        more_images:more_images,
                        colors:colors,
                        offers:offers,
                        delivery_charge:delivery_charge,
                        bread_crumbs : bread_crumbs
                    });
                }

            }
        });
    }

    //--script starts from here------
    console.log('---------------------');
    console.log("Parsing URL :: ");
    console.log(url);
    console.log('---------------------');
    
    var pageHTML = '';
    if (url.length > 1) {
        var iden_website = identifyWebsite(url);
        if (iden_website == false) {
            res.json({
                error:1,
                msg:'website not found in identifyWebsite'
            });
        } else {
            var is_product_page = isProductPage(url);
            if (is_product_page == false) {
                res.json({
                    error:1,
                    msg:'not a product page'
                });
            } else {
                console.log(website_detected);
                console.log('yes product page hai !!!');
                console.log(' !! URL SOURCE :: '+urlsource);
                console.log('******************');
                console.log('iden_website ::: '+iden_website);
                console.log('******************');
                
                if( iden_website == true && website_detected == 'myntra'){
                    url = url.replace('/buy','');
                    myntra_pid = getLastSlash(url);
                    console.log(url);
                    console.log(myntra_pid);
                    url = 'http://developer.myntra.com/style/'+myntra_pid;
                }
                if( iden_website == true && website_detected == 'indiacircus'){
                    console.log(url);
                    url_param = getLastSlash(url);
                    if( typeof url_param != 'undefined' ){
                        var id_url = "http://api.crunchcommerce.com/v2/53a4565652c8fda17b8b456b/search/uri/rewrites?q="+url_param;
                        getHTML(id_url, false, function(err, data) {
                            if (err) {
                                res.json({
                                    error:2,
                                    msg:err
                                });
                            } else {
                                data = JSON.parse(data);
                                if( typeof data.resource.id != 'undefined'){
                                    idid = data.resource.id;
                                    var product_url =  'http://api.crunchcommerce.com/v2/53a4565652c8fda17b8b456b/catalog/products/'+idid+'?image%5Boptions%5D%5Bcrop%5D=pad&image%5Boptions%5D%5Bformat%5D=jpg&image%5Boptions%5D%5Bheight%5D=450&image%5Boptions%5D%5Bquality%5D=90&image%5Boptions%5D%5Bwidth%5D=450';
                                    getHTML(product_url, false, function(err, data) {
                                        if (err) {
                                            res.json({
                                                error:2,
                                                msg:err
                                            });
                                        } else {
                                            processUrl(data, website_detected,url ,urlsource,false, false, function(ret) {
                                                res.json({
                                                    error:0,
                                                    data:ret
                                                });
                                            });
                                        }
                                    });
                                }else{
                                     res.json({
                                        error:0,
                                        data:[]
                                    });
                                }
                            }
                        });
                    }
                    
                    console.log(url_param);
                }
                else{
                    getHTML(url, false, function(err, data) {
                    if (err) {
                        res.json({
                            error:2,
                            msg:err
                        });
                    } else {
                        processUrl(data, website_detected,url ,urlsource,false, false, function(ret) {
                            res.json({
                                error:0,
                                data:ret
                            });
                        });
                    }
                });
                }
                
            }
        }
    }else{
        res.json({
                error:1,
                msg:'url is empty'
            });
    }



    //-----------------------------------------------------------------
    //var mm = identifyWebsite(url);
    //console.log('arun kumar');
    //console.log(website_detected);
    //if( mm == true ){
    //console.log('true hai hai');
    //}else{
//        console.log('false hai hai');
//    }

    function validateProductPage(manual) {
//    ~~~~abhishank: to filter out sites whose product page can not be validated from url //
        var uRL = window.location.href;
        var res = uRL.split("//");
        var hostname = location.hostname + '/';
        var piculear = [
            "nykaa.com",
            "flipkart.com",
            "snapdeal.com",
            "shopclues.com",
            "tradus.com",
            "shopping.indiatimes.com",
            "amazon.in",
            "camera.zoomin.com",
            "saholic.com",
            "landmarkonthenet.com",
            "infibeam.com",
            "homeshop18.com",
            "cromaretail.com",
            "crossword.in",
            "ebay.in",
            "rediff.com",
            "uread.com",
            "bookadda.com",
            "indianbooks.co.in",
            "yebhi.com",
            "adexmart.com",
            "naaptol.com",
            "mirchimart.com",
            "themobilestore.in",
            "bagittoday.com",
            "letsshop.in",
            "edabba.com",
            "onemi.in",
            "suzalin.com",
            "giffiks.com",
            "maniacstore.com",
            "ezeekart.com",
            "pepperfry.com",
            "egully.com",
            "shopbychoice.com",
            "next.co.in",
            "shopsite.in",
            "acadzone.com",
            "reliancedigital.in",
            "dailyobjects.com",
            "ibhejo.com",
            "kaunsa.com",
            "browsecart.com",
            "healthgenie.in",
            "healthkart.com",
            "nykaa.com",
            "ezoneonline.in",
            "babyoye.com",
            "firstcry.com",
            "littleshop.in",
            "mybabycart.com",
            "grabmore.in",
            "ebay.in",
            "purplle.com",
            "medplusbeauty.com",
            "myntra.com",
            "jabong.com"
        ];
        var checkedCookie = false;
        for (var i = 0; i < piculear.length; i++) {
            var web = piculear[i];
            if (location.hostname.toLowerCase().indexOf(web) != -1) {
                checkCookie();
                checkedCookie = true;
            }
        }

        if (res[1] == hostname) {
//            means it is the home page.
            logg('is home page!');
            return false;
        }

        if (!isProductPage(uRL)) {
            logg('is not product page!');
            return false;
        } else {
//        if (!checkedCookie)
            //checkCookie();
        }

        if (piculear.indexOf(location.hostname.toLowerCase()) >= 0) {
            var ret_temp = validatePiculear();
        }
        if (ret_temp) {
            return false;
        }


//        ~~~~abhishank: to filter out sites whose product page can not be validated from url //
        windowURL = window.location.href;
        var iden_website = identifyWebsite();
        if (iden_website == true) {
            return true;
        }


        if (manual == 1) {
            return true;
        }
        return false;
    }





    //validateProductPage(0,url);


});

module.exports = router;
