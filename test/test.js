'use strict';

var fs = require('fs'),
    vm = require('vm'),
    jsHtml = require('../lib/index.js');

var testing; // Used in one of the tests

module.exports = {
    'API Access': function(test) { // Ensures we have access to the JsHtml API
        test.notStrictEqual(jsHtml.script, undefined, 'jsHtml.script function is not defined');

        var script = jsHtml.script();
        test.notStrictEqual(script.setScript, undefined, 'script.setScript function is not defined');
        test.notStrictEqual(script.setScriptFile, undefined, 'script.setScriptFile function is not defined');
        test.notStrictEqual(script.clear, undefined, 'script.clear function is not defined');
        test.notStrictEqual(script.compile, undefined, 'script.compile function is not defined');
        test.notStrictEqual(script.makeFunction, undefined, 'script.makeFunction function is not defined');
        test.notStrictEqual(script.render, undefined, 'script.render function is not defined');

        test.notStrictEqual(jsHtml.compile, undefined, 'jsHtml.compile function is not defined');
        test.notStrictEqual(jsHtml.cached, undefined, 'jsHtml.cached function is not defined');
        test.notStrictEqual(jsHtml.render, undefined, 'jsHtml.render function is not defined');
        test.done();
    },
    'Compiler Sanity Check': function(test) { // Perform basic functions, just to make sure we're all there in the head
        test.throws(function() {
            jsHtml.compile();
        }, undefined, 'Compiler should throw error when no parameter is passed');
        test.equals(jsHtml.compile(''), '', 'Compiler should return an empty string when given an empty string');
        test.equals(jsHtml.compile(new Buffer(0)), '', 'Compiler should return an empty string when given an empty buffer');
        test.equals(vm.runInThisContext(jsHtml.compile('<?js "check" ?>')), 'check', 'Compiler should not wrap code directly');

        test.doesNotThrow(function() {
            vm.runInThisContext(jsHtml.compile(' \b')); // Creates a space, then takes it away (because it's evil like that, mwhahahaha). Prevents skewing of text formatting.
        }, 'eval of a simple document failed. Compiler should use pre-existing API functions');

        test.done();
    },
    'JsHtml Sanity Check': function(test) { // To make sure our interfacing API works as designed
        var script = jsHtml.script('check');
        test.equal(typeof script._script, 'string', 'JsHtml should have an internal string (better performance than using Buffer object)');

        script.setScript('anothercheck');
        test.equal(script._script, 'anothercheck', 'JsHtml should not concatenate buffers');

        script.setScript(new Buffer('check'));
        test.equal(script._script, 'check', 'JsHtml.prototype.setScript should be able to accept/convert Buffer objects');

        test.throws(function() {
            script.setScriptFile();
        }, undefined, 'JsHtml failed to throw an exception calling setScriptFile without a parameter');

        test.doesNotThrow(function() {
            script.setScriptFile('./test/docs/01.basic.jshtml');
        }, undefined, 'JsHtml failed while loading ./test/docs/01.basic.jshtml');

        script.setScript('<html><body>Testing Content Here</body></html>');

        test.doesNotThrow(function() {
            script.compile();
        }, undefined, 'JsHtml failed while compiling');

        test.doesNotThrow(function() {
            script.makeFunction();
        }, undefined, 'JsHtml failed while compiling into an executable function');

        test.doesNotThrow(function() {
            script.render();
        }, undefined, 'JsHtml failed while rendering');

        script.clear();
        test.strictEqual(script._script, undefined, 'script.clear() should clear the internal script string');
        test.strictEqual(script._function, undefined, 'script.clear() should clear the compiled VM function');
        test.strictEqual(script._context, undefined, 'script.clear() should clear the VM context');

        test.done();
    },
    'Advanced Compiler Testing': function(test) { // Now for some fun, let's really try to break this thing.
        test.doesNotThrow(function() {
            test.notEqual(jsHtml.compile('<?js?>'), '');
        }, undefined, 'Compiler failed to parse an immediately closed code block tag');

        test.doesNotThrow(function() {
            test.equals(jsHtml.compile('<?js'), '');
        }, undefined, 'Compiler failed to auto-close left open code block');

        // When testing direct compiler output, remember that ending spaces are not trimmed. <?js ?> will return '', but <?js  ?> will return ' '. This is design, to prevent code like the next test checks for.
        test.notEqual(jsHtml.compile('<?js"check" ?>'), '\"check\" ', 'Compiler failed to treat improperly opended code blocks as normal text');

        test.doesNotThrow(function() { // As I write this test, this should never happen, because there's no HTML parsing taking place. Only included this incase of future changes.
            var tmpScript = 'console.log(\'<script>document.write(\\"Testing here\\")</script>\'); ';
            test.equals(jsHtml.compile('<?js ' + tmpScript + '?>'), tmpScript);
        }, undefined, 'Compiler failed to properly parse valid JavaScript containing a string of HTML');

        test.doesNotThrow(function() { // This is something that gets a lot of parsers out there, false terminations. Is this fails there's likely something wrong with the JavaScript parser that's being used.
            var tmpScript = 'console.log(\'This is how to terminate a code block: ?>\'); ';
            test.equals(jsHtml.compile('<?js ' + tmpScript + '?>'), tmpScript);
        }, undefined, 'Compiler failed to properly parse valid JavaScript containing \'?>\' inside executable code');

        test.doesNotThrow(function() {
            jsHtml.compile('<?js (function() { ?><?js })(); ?>');
            jsHtml.compile('<?js (function() { ?><?js var test = undefined; ?><?js })(); ?>');
        }, undefined, 'Compiler failed to recognize a continuation of a block statement from a separate code block');

        test.notEqual(jsHtml.compile('<?js:testing?>', 'testing'), 'Compiler should not compile direct print code blocks as normal code');

        test.done();
    },
    'Advanced JsHtml Testing': function(test) { // By now the basics have been checked: load, close, buffer, yada yada... Let's see what we can do to break the VM.
        var globalObject = { };
        var context = {
            global: globalObject
        };

        var script = jsHtml.script('<?js testing = \'env1\'; ?>', { context: context });
        // NodeJS versions 0.6.3 to 0.11.6 will fail these context seperation tests. Obviously, that means there's a security vulnerability when ran on those versions.
        (script.makeFunction())();

        test.notEqual(script._context.testing, testing, 'JsHtml compiled scripts must not share a context with the calling process');

        var script2 = jsHtml.script('<?js ?>', { context: context });
        (script2.makeFunction())();

        test.notEqual(script._context.testing, script2._context.testing, 'JsHtml compiled scripts must not share a context with each other');

        test.notEqual(script._context.global, undefined, 'JsHtml script context was not loaded from passed options');

        test.doesNotThrow(function() {
            script.setScript('<?js global.testing = \'check\'; ?>');
            (script.makeFunction())();
        }, undefined, 'JsHtml should allow new variables to be defined inside the global object context');

        test.strictEqual(script._context.global.testing, script2._context.global.testing, 'JsHtml should share the global context between scripts');

        script = jsHtml.script('<?js:\'check\'?>');
        test.equal(script.render(), 'check', 'The output rendering did not return the expected output');
        test.equal(script.render(), 'check', 'The output buffer should be reset for each render. Failure of only this test could indicate a failure in/with calling the context reset callback');

        test.doesNotThrow(function() {
            require('./docs/01.basic.jshtml');
        }, undefined, 'Should be allowed to load .jshtml files using the require() function');

        script = jsHtml.script('<?js require(\'./docs/01.basic.jshtml\');', { filename: __filename });
        test.doesNotThrow(function() {
            (script.makeFunction())();
        }, undefined, 'Should be allowed to load .jshtml files using the require() function inside the JsHtml context');

        test.done();
    },
    'JsHtml API Context Test': function(test) {
        var globalObject = { };
        var context = {
            global: globalObject
        };

        var script = jsHtml.script({ context: context,
 filename: '/test/this/is/a/test.jshtml' });

        test.doesNotThrow(function() {
            script.setScript('<?js require(\'os\'); ?>');
            (script.makeFunction())();
        }, undefined, 'Unable to import the built-in NodeJS module \'os\'. This could indicate an error in the require() function');

        script.setScript('<?js:require(\'os\').platform()');
        test.equals(script.render(), require('os').platform(), 'API failed to import the \'os\' module that would be loaded in normal script context');

        script._context.global.testTimeoutId = setTimeout(function() { });
        script.setScript('<?js clearTimeout(global.testTimeoutId);');
        (script.makeFunction())();
        test.notEqual(script._context.global.testTimeoutId._onTimeout, undefined, 'clearTimeout shim has failed to prevent clearing timeouts that were set in a separate context');

        test.equal(script._context.__filename, '/test/this/is/a/test.jshtml', 'The __filename variable was not correctly set');
        test.equal(script._context.__dirname, '/test/this/is/a', 'The __dirname variable was not correctly set');

        test.done();
    },
    'JsHtml Async Functions': function(test) { // Test all the async based functions
        var count = 0,
            queueCount = 0;
        function queueComplete() {
            if(++count >= queueCount) {
                test.done();
            }
        }

        function queue(func) {
            queueCount++;
            process.nextTick(func);
        }

        queue(function() {
            var script = jsHtml.script('<?js this.complete(); ?>');
            script.render(function(rendered) {
                test.notEqual(rendered, null, 'Async callback parameter should contain rendered script');
                test.equal(rendered, '', 'This async callback parameter should return an empty string');
                queueComplete();
            });
        });

        queue(function() {
            var script = jsHtml.script('Hello<?js this.complete(); ?>, World');
            script.render(function(rendered) {
                test.equal(rendered, 'Hello', 'Async scripts should stop processing where this.complete() is called');
                queueComplete();
            });
        });

        queue(function() {
            var script = jsHtml.script('Hello<?js process.nextTick(function() { this.complete(); }); ?>, World');
            script.render(function(rendered) {
                test.equal(rendered, 'Hello, World', 'Async scripts should not stop processing when this.complete() is called from a queued task');
                queueComplete();
            });
        });

        test.expect(4);
    },
    'API Interface Use': function(test) {
        test.doesNotThrow(function() {
            var rendered = jsHtml.cached('test').render();
            test.equal(jsHtml.cached('test').render(), rendered, 'jshtml.cache did not return the expected string from a basic call');
            test.equal(jsHtml.cached('test', 'test').render(), rendered, 'jshtml.cache did not return the expected string from a call providing the cache name');
            test.equal(jsHtml.cached('test', { context: { } }).render(), rendered, 'jshtml.cache did not return the expected string from a call providing options');
            test.equal(jsHtml.cached('test', 'test', { context: { } }).render(), rendered, 'jshtml.cache did not return the expected string from a call providing the cache name and options');
        }, undefined, 'Error while trying to use jshtml.cache');

        test.doesNotThrow(function() {
            test.equal(jsHtml.render('test', { context: { } }), 'test', 'jshtml.render did not return the expected string from a call');
        }, undefined, 'Error while trying to use jshtml.render');

        test.doesNotThrow(function() {
            test.equal(jsHtml.render('<?js console.log("first statement"); function test(test) { process.stdout.write(test); } test("test string");', {
                optimize: true,
                minify: true
            }), 'first statement\ntest string', 'jshtml options transformed the code incorrectly');
        }, undefined, 'Error while trying to use jshtml options');

        test.done();
    },
    'Files In ./test/docs/': function(test) {
        function testFile(filepath) {
            var script = jsHtml.script();
            test.doesNotThrow(function() {
                script.setScriptFile(filepath);
            }, undefined, '\'' + filepath + '\ failed to load');

            test.doesNotThrow(function() {
                script.compile();
            }, undefined, '\'' + filepath + '\ failed to compile');

            test.doesNotThrow(function() {
                script.makeFunction();
            }, undefined, '\'' + filepath + '\ failed to compile to an executable function');

            test.doesNotThrow(function() {
                script.render();
            }, undefined, '\'' + filepath + '\ failed to render');
        }

        var fileList = fs.readdirSync('./test/docs/');
        for(var i = 0; i < fileList.length; i++) {
            testFile('./test/docs/' + fileList[i]);
        }

        test.done();
    }
};
