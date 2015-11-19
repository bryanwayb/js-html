'use strict';

var jshtml = require('../lib/index.js');

var script = jshtml.script('<?js console.log(this);');
console.log(script.render());