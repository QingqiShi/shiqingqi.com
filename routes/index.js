var express = require('express');
var pusher = require('./pusher');
var router = express.Router();

var pushList = [
    {
        path: '/webcomponentsjs/webcomponents-loader.js',
        type: 'javascript'
    },
    {
        path: '/elements/main.html',
        notBower: true
    },
    {
        path: '/stylesheets/style.css',
        type: 'css',
        notBower: true
    },
    {
        path: '/elements/my-footer.html',
        notBower: true
    }
];

/* GET home page. */
router.get('/', function(req, res, next) {
    pusher(res, pushList);

    res.render('index', { title: 'Qingqi Shi' });

});

module.exports = router;
