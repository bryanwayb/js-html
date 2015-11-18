'use strict';

var jshtml = require('../lib/index.js');

var script = jshtml.JsHtml();
script.setScript('<?js console.log(\'This is how to terminate a code block: ?>\'); ?>');
console.log(script.makeFunction()());