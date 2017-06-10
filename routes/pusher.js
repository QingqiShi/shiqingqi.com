var express = require('express');
var fs = require('fs');

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
            var content = fs.readFileSync(__dirname + '/../public' + obj.path, {encoding: 'utf8'});
        } else {
            var content = fs.readFileSync(__dirname + '/../bower_components' + obj.path, {encoding: 'utf8'});
        }

        // Options
        if (typeof obj.type == 'undefined' || obj.type == 'html') {
            var opt = htmlOptions;
        } else if (obj.type == 'javascript') {
            var opt = javascriptOptions;
        } else {
            var opt = cssOptions;
        }

        // Push
        res.push(obj.path, opt).end(content);
    }
};

module.exports = pusher;
