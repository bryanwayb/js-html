'use strict';

var
	compile = require('./compile.js'),
	fs = require('fs'),
	vm = require('vm'),
	path = require('path');

var _globalVMContext = { };
var _createNewVMContext;
function createNewVMContext(context) {
    if(!_createNewVMContext) { // Wrap the context creation into a function for caching. Bypasses recompiling eveytime we need a new context
        _createNewVMContext = vm.runInContext('(function(module) {' + fs.readFileSync(__dirname + '/context.js') + '})', vm.createContext(
			{
    require: require,
    process: process,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimeout: clearTimeout,
    Buffer: Buffer
			}
		));
    }

    var contextModule = { };
    _createNewVMContext(contextModule);

    if(context) {
        for(var property in context) {
            if(context.hasOwnProperty(property)) {
                contextModule.exports[property] = context[property];
            }
        }
    }

    contextModule.exports.global = _globalVMContext;
    return vm.createContext(contextModule.exports);
}

// Represents JsHtml script
/* Options:
	{
		encoding: 'utf8', // Encoding to use whenever a buffer needs to be converted into a string
		context: undefined // Optional context to pass to the executing script
	}
*/
function JsHtml(filepath, options) {
    this._options = options || { };
    this._encoding = this._options.encoding || 'utf8';

    this.reset();

    if(filepath) {
        this.loadFile(filepath);
    }
}

// Synchronously load script
JsHtml.prototype.loadFile = function(filepath) {
    if(!filepath) {
        throw 'no filepath parameter given';
    }

    filepath = path.resolve(process.cwd(), filepath); // fs.readFileSync uses process.cwd for relative paths, so it's a safe bet to use this here.

    this._buffer = fs.readFileSync(filepath, this._encoding); // Changed from { encoding: this._encoding } for legacy purposes
    this._filepath = filepath;
};

JsHtml.prototype.reloadFile = function() {
    if(!this._filepath) {
        throw 'no filepath has been set';
    }

    var filepath = this._filepath;
    this.closeFile();
    this.loadFile(filepath);
};

JsHtml.prototype.closeFile = function() {
    if(!this._filepath) {
        throw 'no file to close';
    }

    this.reset();
};

// Manually set the buffer
JsHtml.prototype.loadBuffer = function(buffer) {
    this.reset();

    if(Buffer.isBuffer(buffer)) {
        this._buffer = buffer.toString(this._encoding);
    }
    else {
        this._buffer = buffer;
    }

    this._filepath = undefined;
};

JsHtml.prototype.reset = function() {
    this._filepath = undefined;
    this._buffer = undefined;
    this._vmCompiled = undefined;
    this._executionContext = undefined;
};

// Compiles the JsHtml script and returns JS
JsHtml.prototype.compile = function() {
    return compile(this._buffer);
};

// Calls compile() and executes inside a VM instance to return
JsHtml.prototype.compileVM = function() {
    var compiledJs = this.compile();
    var vmCompiled = this._vmCompiled = vm.runInContext('(function() {' + compiledJs + '});', (this._executionContext = createNewVMContext(this._options.context)));
    if(!vmCompiled || typeof vmCompiled !== 'function') {
        throw 'unable to create VM method';
    }

    this._executionContext.__init_script(this._filepath);

    return vmCompiled;
};

// Render the script
JsHtml.prototype.render = function() {
    if(!this._vmCompiled) {
        this._vmCompiled = this.compileVM();
    }

    this._vmCompiled();

    var scriptOutput = this._executionContext.process.stdout._getBuffer();
    this._executionContext.__render_end();
    return scriptOutput;
};

module.exports = JsHtml;
