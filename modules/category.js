module.exports = function(){
    return function( req, res,next){
        var category = req.conn_category;
        var website_scrap_data = req.conn_website_scrap_data;
        category.find({
            'is_fashion':1
        },function(err,data){
            req.category_list = data;
            cat_list = data;
            var catalog = {};
            var catalog_cats = new Array();
            Object.keys(cat_list).forEach(function(key){
                var x = cat_list[key];
                cat_id = x.get('cat_id');
                sub_cat_id = x.get('sub_cat_id');
                cat_name = x.get('name');
                parent_cat_id = x.get('cat_id');
                parent_cat_name = x.get('parent_cat_name');
                single_cat_id = x.get('single_cat_id');
                parent_exists = false;
                catalog_cats.forEach(function(val,key){
                    if( val.cat_id == cat_id){
                        parent_exists = true;
                    }
                });
                if( parent_exists == false ){
                    generateParent = {};
                    generateParent['name'] = parent_cat_name;
                    generateParent['cat_id'] = cat_id;
                    generateParent['sub_cat_id'] = -1;
                    generateParent['data'] = new Array();
                    catalog_cats.push(generateParent);
                }
                if( sub_cat_id != -1 ){
                    catalog_cats.forEach(function(val,key){
                        if( val.cat_id == cat_id){
                            generateSubCat = {};
                            generateSubCat['name'] = cat_name;
                            generateSubCat['cat_id'] = cat_id;
                            generateSubCat['sub_cat_id'] = sub_cat_id;
                            catalog_cats[key]['sub_cat_id'] = 1;
                            catalog_cats[key]['data'].push(generateSubCat);
                        }
                    });
                }
            });
            catalog['cats'] = catalog_cats;
            //res.json(catalog);
            req.catalog=catalog;
            next();
        });
    }
}