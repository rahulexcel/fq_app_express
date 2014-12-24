module.exports = function () {

    return function (req, res, next) {
        var filters_category_wise = req.conn_filters_category_wise;
        var where = {
            'cat_id': req.body.cat_id,
            'sub_cat_id': req.body.sub_cat_id,
        };
        var filters = {};
        filters_category_wise.where(where).find(results);
        function results(err, data) {
            if (data.length > 0) {
                raw_filters = data[0].get('filters').api_filters;
                filters = raw_filters;
                req.filters_to_show = filters;
                next();
            } else {
                next();
            }
        }
    }
}