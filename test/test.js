var fs = require('fs');

var jsHtmlModule = require("../lib/index.js");
var JsHtml = jsHtmlModule.JsHtml;
var Compiler = jsHtmlModule.Compiler;

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
        test.equals(eval(Compiler('<?js "check" ?>')), 'check', 'Compiler should not inject code directly');
        
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
        }, undefined, 'JsHtml failed while compilation');
        
        test.doesNotThrow(function() {
            script.compileVM();
        }, undefined, 'JsHtml failed while compilation into an executable function');
        
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
            test.equals(Compiler('<?js %>'), ' ');
            test.equals(Compiler('<% ?>'), ' ');
        }, undefined, 'Compiler failed to close inverted code block tags');
        
        test.doesNotThrow(function() {
            test.equals(Compiler('<?js'), '');
            test.equals(Compiler('<%'), '');
        }, undefined, 'Compiler failed to auto-close left open code block');
        
        test.throws(function() {
            Compiler('<?check ?>');
        }, undefined,  'Compiler failed to deliver a syntax error when missing whitespace after the beginning of a code block');
        
        test.doesNotThrow(function() {
            Compiler('<? check?>');
        }, undefined,  'Compiler delivered a syntax error when code block terminated without whitespace separation');
        
        test.doesNotThrow(function() { // As I write this test, this should never happen, because there's no HTML parsing taking place. Only included this incase of future changes.
            var tmpScript = ' console.log(\'<script>document.write(\\"Testing here\\")</script>\'); ';
            test.equals(Compiler('<?js' + tmpScript + '?>'), tmpScript);
        }, undefined, 'Compiler failed to properly parse valid JavaScript containing a string of HTML');
        
        test.doesNotThrow(function() { // This is something that gets alot of parsers out there, false terminations. Is this fails there's likely something wrong with the JavaScript parser that's being used.
            var tmpScript = ' console.log(\'This is how to terminate a code block: ?>\'); ';
            test.equals(Compiler('<?js' + tmpScript + '?>'), tmpScript);
        }, undefined, 'Compiler failed to properly parse valid JavaScript containing \'?>\' inside executable code');
        
        test.throws(function() {
            Compiler('<? console.log( -asdf; ?>');
        }, undefined,  'Compiler failed to recognize a syntax error');

        test.done();
    },
    "Advanced JsHtml Testing": function(test) { // By now the basic load, close, buffer, yada yada... Let's see what we can do to break the VM.
        // TODO
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