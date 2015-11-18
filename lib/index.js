'use strict';

var JsHtml = require('./jshtml.js');

module.exports = {
    JsHtml: JsHtml,
    compile: require('./compile.js')
};

require.extensions['.jshtml'] = function(m, filename) {
    m.exports = new JsHtml(filename);
    m.exports.compileVM();
    m.exports._executionContext.module = m;
};