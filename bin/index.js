'use strict';

var jshtml = require('../lib/index.js');

var script = jshtml.script();
script.setScriptFile('./test/docs/05.advanced.jshtml');
console.log(script.render());