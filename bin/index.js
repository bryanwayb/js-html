var jshtml = require('../lib/index.js'),
	fs = require('fs'),
	path = require('path');

console.log('|' + jshtml.compile('<?js?>') + '|');
console.log('|' + jshtml.compile('<?js') + '|');
console.log('|' + jshtml.compile('<?js "sadf" ?>') + '|');
console.log('|' + jshtml.compile('<?js check?>') + '|');
console.log('|' + jshtml.compile('<?js console.log(\'<script>document.write(\\"Testing here\\")</script>\'); ?>') + '|');
console.log('|' + jshtml.compile('<?js console.log(\'This is how to terminate a code block: ?>\'); ?>') + '|');
console.log('|' + jshtml.compile('<?js (function() { ?><?js var test = undefined; ?><?js })(); ?>') + '|');
console.log('|' + jshtml.compile('<?js:testing?>') + '|');