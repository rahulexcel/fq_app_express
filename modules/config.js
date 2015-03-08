module.exports = function () {
    return function (req, res, next) {
        config = {
            'products_per_page': 10,
            'product_data_list': 'cat_id sub_cat_id name website brand price img href offrate price_history price_diff sort_score model_no', // add here to get fields in product info
        };
//        body = {
//            'cat_id':30,
//            'sub_cat_id':3001,
//            'father_key':'men',
//            'father_text':'men',
//            'page':1,
//            'filters':[
//                {name: 'Name',param: filter__text__website__snapdeal},
//            ],
//            //filter : [{
//                //size : [size1,soze2             ]
//            //}]
//        };
        req.config = config;
//        req.body = body;
        next();
    }
}