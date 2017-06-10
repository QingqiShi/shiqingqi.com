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
    // {
    //     path: '/polymer/polymer-element.html',
    // },
    // {
    //     path: '/iron-pages/iron-pages.html',
    // },
    // {
    //     path: '/iron-media-query/iron-media-query.html'
    // },
    // {
    //     path: '/iron-location/iron-location.html'
    // },
    // {
    //     path: '/iron-location/iron-query-params.html'
    // },
    // {
    //     path: '/app-layout/app-scroll-effects/app-scroll-effects.html'
    // },
    // {
    //     path: '/paper-icon-button/paper-icon-button.html'
    // },
    // {
    //     path: '/app-layout/app-layout.html'
    // },
    // {
    //     path: '/paper-tabs/paper-tabs.html'
    // },
    // {
    //     path: '/paper-item/paper-item.html'
    // },
    // {
    //     path: '/paper-listbox/paper-listbox.html'
    // },
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
