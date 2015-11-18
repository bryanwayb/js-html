'use strict';

var jsHtml = require('./jshtml.js'),
    compile = require('./compile.js');

var cacheEntry = { };

module.exports = {
    script: jsHtml,
    compile: compile,
    cached: function(script, cache, options) {
        if(!options && cache) {
            options = cache;
            cache = null;
        }

        if(!cache) {
            cache = script;
        }

        var c = cacheEntry[cache];
        if(!c) {
            c = cacheEntry[cache] = jsHtml(script, options);
        }
        return c;
    },
    render: function(script, options) {
        return jsHtml(script, options).render();
    }
};

require.extensions['.jshtml'] = function(m, filename) {
    var script = jsHtml();
    script.setScriptFile(filename);
    script.makeFunction();
    script._context.module = m;
    m.exports = script;
};