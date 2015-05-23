var fs = require('fs');

var jsHtmlModule = require("../lib/index.js");
var JsHtml = jsHtmlModule.JsHtml;
var Compiler = jsHtmlModule.Compiler;

var testing = undefined; // Used in one of the tests

module.exports = {
    "Initialization": function(test) { // Ensures we have access to the JsHtml object
        test.notStrictEqual(new JsHtml(), undefined, 'Failed to initialize JsHtml object');
        test.notStrictEqual(Compiler, undefined, 'Compiler function is not defined');
        test.done();
    },
    "Compiler Sanity Check": function(test) { // Perform basic functions, just to make sure we're all there in the head
        test.throws(function () {
            Compiler();
            }, undefined, 'Compiler should throw error when no parameter is passed');
        test.equals(Compiler(''), '', 'Compiler should return an empty string when given an empty string');
        test.equals(eval(Compiler('<?js "check" ?>')), 'check', 'Compiler should not wrap code directly');
        
        test.doesNotThrow(function() {
            eval(Compiler(' \b')); // Creates a space, then takes it away (because it's evil like that, mwhahahaha). Prevents skewing of text formatting.
        }, 'eval of a simple document failed. Compiler should use pre-existing API functions');
        
        test.done();
    },
    "JsHtml Sanity Check": function(test) { // To make sure our interfacing API works as designed
        test.throws(function() {
            new JsHtml('./non-existant-file');
        }, undefined,  'JsHtml should throw an error when trying to load a file that does not exist');
        
        test.throws(function() {
            (new JsHtml()).reloadFile();
        }, undefined,  'JsHtml should throw an error when trying to reload a file when one has not been loaded');
        
        test.throws(function() {
            (new JsHtml()).closeFile();
        }, undefined,  'JsHtml should throw an error when trying to close a file when one has not been loaded');
        
        var script = new JsHtml();
        script.loadBuffer('check');
        test.equal(script._buffer, 'check', 'JsHtml should have an internal string based buffer (better performance than using binary)');

        script.loadBuffer('anothercheck');
        test.equal(script._buffer, 'anothercheck', 'JsHtml should not concatenate buffers');
        
        script.loadBuffer(new Buffer('check'));
        test.equal(script._buffer, 'check', 'JsHtml.prototype.loadBuffer should be able to accept Buffer objects');
        
        test.doesNotThrow(function() {
            script.loadFile('./test/docs/01.basic.jshtml');
        }, undefined, 'JsHtml failed while loading ./test/docs/01.basic.jshtml');
        
        test.doesNotThrow(function() {
            script.reloadFile();
        }, undefined, 'JsHtml failed while reloading the file');
        
        test.doesNotThrow(function() {
            script.closeFile();
        }, undefined, 'JsHtml failed while closing the file');
        
        script.loadBuffer('<html><body>Testing Content Here</body></html>');
        
        test.doesNotThrow(function() {
            script.compile();
        }, undefined, 'JsHtml failed while compiling');
        
        test.doesNotThrow(function() {
            script.compileVM();
        }, undefined, 'JsHtml failed while compiling into an executable function');
        
        test.doesNotThrow(function() {
            script.render();
        }, undefined, 'JsHtml failed while rendering');
        
        script.reset();
        test.strictEqual(script._buffer, undefined, 'JsHtml.prototype.reset should clear the internal buffer');
        test.strictEqual(script._filepath, undefined, 'JsHtml.prototype.reset should clear the loaded files path');
        test.strictEqual(script._vmCompiled, undefined, 'JsHtml.prototype.reset should clear the compiled VM function');
        test.strictEqual(script._executionContext, undefined, 'JsHtml.prototype.reset should clear the compiled VM context');
        
        test.done();
    },
    "Advanced Compiler Testing": function(test) { // Now for some fun, let's really try to break this thing.
        test.doesNotThrow(function() {
            test.equals(Compiler('<?js?>'), '');
            test.equals(Compiler('<%%>'), '');
        }, undefined, 'Compiler failed to parse an immediately closed code block tag');
        
        test.doesNotThrow(function() {
            test.equals(Compiler('<?js %>'), '');
            test.equals(Compiler('<% ?>'), '');
        }, undefined, 'Compiler failed to close inverted code block tags');
        
        test.doesNotThrow(function() {
            test.equals(Compiler('<?js'), '');
            test.equals(Compiler('<%'), '');
        }, undefined, 'Compiler failed to auto-close left open code block');
        
        // When testing direct compiler output, remember that ending spaces are not trimmed. <?js ?> will return '', but <?js  ?> will return ' '. This is design, to prevent code like the next test checks for.
        test.notEqual(Compiler('<?js"check" ?>'), '\"check\" ', 'Compiler failed to treat improperly opended code blocks as normal text');
        
        test.doesNotThrow(function() {
            Compiler('<?js check?>');
        }, undefined,  'Compiler delivered a syntax error when code block terminated without whitespace separation');
        
        test.doesNotThrow(function() { // As I write this test, this should never happen, because there's no HTML parsing taking place. Only included this incase of future changes.
            var tmpScript = 'console.log(\'<script>document.write(\\"Testing here\\")</script>\'); ';
            test.equals(Compiler('<?js ' + tmpScript + '?>'), tmpScript);
        }, undefined, 'Compiler failed to properly parse valid JavaScript containing a string of HTML');
        
        test.doesNotThrow(function() { // This is something that gets a lot of parsers out there, false terminations. Is this fails there's likely something wrong with the JavaScript parser that's being used.
            var tmpScript = 'console.log(\'This is how to terminate a code block: ?>\'); ';
            test.equals(Compiler('<?js ' + tmpScript + '?>'), tmpScript);
        }, undefined, 'Compiler failed to properly parse valid JavaScript containing \'?>\' inside executable code');
        
        test.throws(function() {
            Compiler('<?js console.log( -asdf; ?>');
        }, undefined,  'Compiler failed to recognize a syntax error');
        
        test.doesNotThrow(function() {
            Compiler('<?js (function() { ?><?js })(); ?>');
        }, undefined,  'Compiler failed to recognize a continuation of a block statement from a separate code block');

        test.done();
    },
    "Advanced JsHtml Testing": function(test) { // By now the basics have been checked: load, close, buffer, yada yada... Let's see what we can do to break the VM.
        var script = new JsHtml();
        
        // NodeJS versions 0.6.3 to 0.11.6 will fail these context seperation tests. Obviously, that means there's a security vulnerability when ran on those versions.
        script.loadBuffer('<?js testing = \'env1\'; ?>');
        (script.compileVM())();
        
        test.notEqual(script._executionContext.testing, testing, 'JsHtml compiled scripts must not share a context with the calling process');
        
        var script2 = new JsHtml();
        script2.loadBuffer('<?js ?>');
        (script2.compileVM())();
        
        test.notEqual(script._executionContext.testing, script2._executionContext.testing, 'JsHtml compiled scripts must not share a context with each other');
        
        test.notEqual(script._executionContext.global, undefined, 'JsHtml script contexts should provide a global variable that is shared between scripts');
        
        test.doesNotThrow(function() {
            script.loadBuffer('<?js global.testing = \'check\'; ?>');
            (script.compileVM())();
        }, undefined, 'JsHtml should allow new variables to be defined inside the global object context');
        
        test.strictEqual(script._executionContext.global.testing, script2._executionContext.global.testing, 'JsHtml should share the global context between scripts');
        
        script = new JsHtml();
        script.loadBuffer('<?js process.stdout.write(\'check\'); ?>');
        script.render();
        test.equal(script.render(), 'check', 'The output buffer should be reset for each render. Could indicate a failure in/with calling the context reset callback.');
        
        test.done();
    }
};

module.exports.File = [];
var fileList = fs.readdirSync('./test/docs/');
for(var i = 0; i < fileList.length; i++) {
    var filepath = './test/docs/' + fileList[i];
    module.exports.File[filepath] = function(test) {
        var script = new JsHtml();
        test.doesNotThrow(function() {
            script.loadFile(filepath);
        }, undefined, '\'' + filepath + '\ failed to load');
        
        test.doesNotThrow(function() {
            script.compile();
        }, undefined, '\'' + filepath + '\ failed to compile');
        
        test.doesNotThrow(function() {
            script.compileVM();
        }, undefined, '\'' + filepath + '\ failed to compile to an executable function');
        
        test.doesNotThrow(function() {
            script.render();
        }, undefined, '\'' + filepath + '\ failed to render');
       test.done();
    };
}