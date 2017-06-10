var express = require('express');
var fs = require('fs');
var sass = require('node-sass');

// Obj = [{path, type}]

var htmlOptions = {
    method: 'GET',
    request: { accept: '*/*' },
    response: { 'content-type': 'text/html; charset=UTF-8' }
}

var javascriptOptions = {
    method: 'GET',
    request: { accept: '*/*' },
    response: { 'content-type': 'application/javascript' }
}

var cssOptions = {
    method: 'GET',
    request: { accept: '*/*' },
    response: { 'content-type': 'text/css' }
}

var pusher = function(res, options) {


    for (var i = 0; i < options.length; i++)
    {
        var obj = options[i];

        // Content
        if (typeof obj.notBower != 'undefined' && obj.notBower) {
            var path = __dirname + '/../public' + obj.path;
        } else {
            var path = __dirname + '/../bower_components' + obj.path;
        }

        // Options
        if (typeof obj.type == 'undefined' || obj.type == 'html') {
            var opt = htmlOptions;
            var content = fs.readFileSync(path, {encoding: 'utf8'});
        } else if (obj.type == 'javascript') {
            var opt = javascriptOptions;
            var content = fs.readFileSync(path, {encoding: 'utf8'});
        } else {
            var opt = cssOptions;
            var content = sass.renderSync({
                file: path
            }).css;
        }

        // Push
        res.push(obj.path, opt).end(content);
    }
};

module.exports = pusher;
