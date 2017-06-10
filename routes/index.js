var express = require('express');
var pusher = require('./pusher');
var router = express.Router();

var pushList = [
    {
        path: '/stylesheets/style.css',
        type: 'css',
        notBower: true
    }
];

/* GET home page. */
router.get('/', function(req, res, next) {
    if (typeof res.push == 'function') {
        pusher(res, pushList);
    }

    res.render('index', { title: 'Qingqi Shi' });

});

module.exports = router;
