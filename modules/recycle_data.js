module.exports = function(){
    return function( req, res, next){
        var category = req.conn_category;
        //---fetch catgegory listing and create father_wise_listing--------------------------------------
        category.find({
            'is_fashion': 1
        }, function (err, data) {
            req.recycle_data = {};
            if (err) {
                req.recycle_data.father_wise_listing_status = 2;
                req.recycle_data.father_wise_listing_msg = err.err;
                req.recycle_data.father_wise_listing = [];
                req.recycle_data.category_listing = [];
                next();
            } else {
                if (data.length == 0) {
                    req.recycle_data.father_wise_listing_status = 1;
                    req.recycle_data.father_wise_listing_msg = 'empty data';
                    req.recycle_data.father_wise_listing = [];
                    req.recycle_data.category_listing = [];
                    next();
                } else {
                    cat_list = data;
                    var catalog = {};
                    var father_wise_listing = new Array();
                    var catalog_cats = new Array();
                    Object.keys(cat_list).forEach(function (key) {
                        var x = cat_list[key];
                        cat_id = x.get('cat_id');
                        sub_cat_id = x.get('sub_cat_id');
                        cat_name = x.get('name');
                        parent_cat_id = x.get('cat_id');
                        parent_cat_name = x.get('parent_cat_name');
                        single_cat_id = x.get('single_cat_id');
                        //father_key = x.get('father_key');
                        //father_text = x.get('father_text');
                        org_father_key = x.get('father_key');
                        father_key = x.get('api_menu_father_key');
                        father_text = x.get('api_menu_father_text');
                        father_order = x.get('father_order');
                        api_father_order = x.get('api_father_order');
                        api_menu_cat_order = x.get('api_menu_cat_order');

                        father_exists = false;
                        father_wise_listing.forEach(function (val, key) {
                            if (val.father_key == father_key) {
                                father_exists = true;
                            }
                        });
                        if (father_exists == false) {
                            generateFather = {};
                            generateFather['name'] = father_text;
                            generateFather['cat_id'] = -1;
                            generateFather['sub_cat_id'] = -1;
                            generateFather['father_key'] = father_key;
                            generateFather['father_text'] = father_text;
                            generateFather['father_order'] = father_order;
                            generateFather['api_father_order'] = api_father_order;
                            generateFather['all_cat_id'] = new Array();
                            generateFather['all_cat_id'].push(cat_id);
                            generateFather['data'] = new Array();
                            father_wise_listing.push(generateFather);
                        } 
                        father_wise_listing.forEach(function (val, key) {
                            if (val.father_key == father_key) {
                                if( org_father_key == 'furniture' || org_father_key == 'home_decor' || org_father_key == 'cases_covers' ){
                                    //this will without parent i.e direct categroy will shown
                                    parent_wise = val.data;
                                    generateSubCat = {};
                                    generateSubCat['name'] = cat_name;
                                    generateSubCat['cat_id'] = cat_id;
                                    generateSubCat['sub_cat_id'] = sub_cat_id;
                                    parent_wise.push(generateSubCat);
                                }else{
                                    parent_exists = false;
                                    parent_wise = val.data;
                                    parent_wise.forEach(function (val1, key1) {
                                        if (val1.cat_id == cat_id) {
                                            parent_exists = true;
                                        }
                                    });
                                    var is_single_parent = false;
                                    if( org_father_key == 'watches' || org_father_key == 'sunglasses'){
                                        is_single_parent = true;
                                    }
                                    if (parent_exists == false) {
                                        generateParent = {};
                                        generateParent['name'] = parent_cat_name;
                                        generateParent['cat_id'] = cat_id;
                                        generateParent['sub_cat_id'] = -1;
                                        if( is_single_parent == true ){
                                            generateParent['sub_cat_id'] = sub_cat_id;
                                        }
                                        generateParent['api_menu_cat_order'] = api_menu_cat_order;
                                        father_wise_listing[key]['all_cat_id'].push(cat_id);
                                        generateParent['data'] = new Array();
                                        parent_wise.push(generateParent);
                                    }
                                    if (sub_cat_id != -1 && is_single_parent == false) {
                                        parent_wise.forEach(function (val2, key2) {
                                            if (val2.cat_id == cat_id) {
                                                generateSubCat = {};
                                                generateSubCat['name'] = cat_name;
                                                generateSubCat['cat_id'] = cat_id;
                                                generateSubCat['sub_cat_id'] = sub_cat_id;
                                                parent_wise[key2]['sub_cat_id'] = 1;
                                                parent_wise[key2]['data'].push(generateSubCat);
                                            }
                                        });
                                    }
                                }
                            }
                        });
                        
                    });
                    if( father_wise_listing.length > 0 ){
                        father_wise_listing.sort(function (a, b) {
                            if( a.api_father_order > b.api_father_order){
                                return 1;
                            }else{
                                return 0;
                            }
                        });
                        father_wise_listing.forEach(function (val11, key11) {
                            if( val11.father_key == 'women' || val11.father_key == 'men'){
                                val11_data = val11.data;
                                val11_data.sort(function (a, b) {
                                    if( a.api_menu_cat_order > b.api_menu_cat_order){
                                        return 1;
                                    }else{
                                        return 0;
                                    }
                                });
                            }
                        });
                    }
                    
                    req.recycle_data.father_wise_listing_status = 0;
                    req.recycle_data.father_wise_listing_msg = 'success';
                    req.recycle_data.father_wise_listing = father_wise_listing;
                    req.recycle_data.category_listing = data;
                    next();
                }
            }
        });
    }
}