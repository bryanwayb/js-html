'use strict';

var jsHtml = require('./jshtml.js');

module.exports = {
    jsHtml: jsHtml,
    compile: require('./compile.js')
};

require.extensions['.jshtml'] = function(m, filename) {
    m.exports = new JsHtml(filename);
    m.exports.compileVM();
    m.exports._executionContext.module = m;
};