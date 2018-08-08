var ServiceWorkerWebpackPlugin = require('serviceworker-webpack-plugin');
var path = require('path');

module.exports = {
    lintOnSave: false,
    configureWebpack: {
        plugins: [
            new ServiceWorkerWebpackPlugin({
                entry: path.join(__dirname, 'src/sw.js')
            })
        ]
    }
};
