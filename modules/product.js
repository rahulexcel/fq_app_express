module.exports = function () {

    var productObj = {
        //every product which will be used should pass through getProductPermit function
        getProductPermit: function (req, p) {
            var all_category_list = req.recycle_data.category_listing;
            //------for---testing--remove it after testing
            //p_drop = p.get('price_drop');
            //random_price_ddrop = Math.floor((Math.random() * 1000) + 1); 
            //if( random_price_ddrop < 500 ){
            //random_price_ddrop = random_price_ddrop*-1;
            //}
            //-----------testing -- remove till here after testing

            var doByGetSet = false;
            p_mongo_id = '';
            p_father_key = '';
            p_father_text = '';
            p_parent_cat_name = '';
            p_cat_name = '';
            p_url_category_name = '';
            org_href = '';
            p_desktop_href = 'http://fashioniq.in/';
            price_drop = '';
            price_drop_final = 0;
            p_image = 'http://dyc4yp9si5syy.cloudfront.net/v1/picture/images/';

            var p_website = p['website'];
            if (typeof p_website == 'undefined') {
                doByGetSet = true
                p_mongo_id = p.get('_id');
                p_cat_id = p.get('cat_id');
                p_sub_cat_id = p.get('sub_cat_id');
                p_website = p.get('website');
                p_url = p.get('href');
                org_href = p_url;
                price_drop = p.get('price_diff');
                aff_url = productObj.getAffiliateUrl(p_website, p_url);
                //p_image = p_image+p_mongo_id;
                p_image = p.get('img');
            } else {
                p_mongo_id = p['_id'];
                p_cat_id = p['cat_id'];
                p_sub_cat_id = p['sub_cat_id'];
                p_url = p['href'];
                price_drop = p['price_diff'];
                org_href = p_url;
                aff_url = productObj.getAffiliateUrl(p_website, p_url);
                //p_image = p_image+p_mongo_id;
                p_image = p['img'];
            }

            if (typeof price_drop != 'undefined') {
                price_drop_final = price_drop;
            }

            for (var i = 0; i < all_category_list.length; i++) {
                var row_cat_id = all_category_list[i].get('cat_id');
                var row_sub_cat_id = all_category_list[i].get('sub_cat_id');
                if (p_cat_id == row_cat_id && p_sub_cat_id == row_sub_cat_id) {
                    p_father_key = all_category_list[i].get('father_key');
                    p_father_text = all_category_list[i].get('father_text');
                    p_parent_cat_name = all_category_list[i].get('parent_cat_name');
                    p_cat_name = all_category_list[i].get('cat_name');
                    p_url_category_name = all_category_list[i].get('url_category_name');
                }
            }
            p_desktop_href += p_father_key + '/' + p_url_category_name + '/' + p_mongo_id;
            if (doByGetSet == true) {
                p.set('org_href', org_href);
                p.set('href', aff_url);
                p.set('price_drop', price_drop_final);
                p.set('desktop_href', p_desktop_href);
                p.set('img', p_image);
            } else {
                p['org_href'] = org_href;
                p['href'] = aff_url;
                p['price_drop'] = price_drop_final;
                p['desktop_href'] = p_desktop_href;
                p['img'] = p_image;
            }
            // console.log(p_website);
            //var p_website = p.get('website');
            //var p_url = p.get('href');
            ///var aff_url = productObj.getAffiliateUrl( p_website, p_url );
            //p.set('href',aff_url);

            // console.log(p);

            return p;
        },
        getAffiliateUrl: function (website, url) {
            var aff_url = '';
            if (website == 'Flipkart') {
                if (url.indexOf('manishexce') != -1) {
                    url = url;
                } else {
                    if (url.indexOf('?') == -1) {
                        url += '?affid=manishexce';
                    } else {
                        url += '&affid=manishexce';
                    }
                }
                if (url.indexOf('flipkart.com/dl/') != -1 || url.indexOf('dl.flipkart.com') != -1) {
                } else {
                    url = url.replace('www.', '');
                    url = url.replace('flipkart.com/', 'dl.flipkart.com/dl/');
                }
                aff_url = url;
            } else if (website == 'Snapdeal') {
                if (url.indexOf('aff_id=1210') != -1) {
                    url = url;
                }
                {
                    if (url.indexOf('?') == -1) {
                        url += '?offer_id=17';
                    } else {
                        url += '&offer_id=17';
                    }
                    url += '&aff_id=1210';
                    url += '&utm_source=aff_prog';
                    url += '&utm_campaign=afts';
                }
                aff_url = url;
            }else  if (website == 'amazon') {
                if (url.indexOf('pricegenie-21') != -1) {
                    url = url;
                } else {
                    if (url.indexOf('?') == -1) {
                        url += '?linkCode=as2';
                    } else {
                        url += '&linkCode=as2';
                    }
                    url += '&tag=pricegenie-21';
                }
                aff_url = url;
            }  else {
                aff_url = 'http://linksredirect.com?pub_id=2491CL2376&url=' + encodeURIComponent(url);
            }
            return aff_url;
        }
    };
    return function (req, res, next) {
        req.productObj = productObj;
        next();
    }
}