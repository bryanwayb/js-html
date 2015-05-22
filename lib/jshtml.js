var
	JsHtmlCompile = require('./compile.js'),
	fs = require('fs'),
	vm = require('vm');

// Represents JsHtml script
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
	
	this._buffer = fs.readFileSync(filepath, {
		encoding: this._encoding
	});
	this._filepath = filepath;
};

JsHtml.prototype.reloadFile = function() {
	if(!this._filepath) {
		throw 'no filepath has been set';
	}
	
	var filepath = this._filepath;
	this.closeFile();
	this.loadFile(filepath);
}

JsHtml.prototype.closeFile = function() {
	if(!this._filepath) {
		throw 'no file to close';
	}
	
	this.reset();
};

// Manually set the buffer
JsHtml.prototype.loadBuffer = function(buffer) {
	if(Buffer.isBuffer(buffer)) {
		this._buffer = buffer.toString(this._encoding)
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
	// TODO: Add fs.statSync and fs.stat file watching when the source is a file. Would use fs.watch, but too unstable even for early development tests.
	return JsHtmlCompile(this._buffer);
};

// Calls compile() and executes inside a VM instance to return 
JsHtml.prototype.compileVM = function() {
	var compiledJs = this.compile();
		
	this._executionContext = vm.createContext(require('./context.js'));

	var vmCompiled = this._vmCompiled = vm.runInContext('(function() {' + compiledJs + '});', this._executionContext);
	if(!vmCompiled || typeof vmCompiled !== 'function') {
		throw 'unable to create VM method';
	}
	
	return vmCompiled;
};

// Render the script
JsHtml.prototype.render = function() {
	if(!this._vmCompiled) {
		this._vmCompiled = this.compileVM();
	}
	
	this._vmCompiled();
	
	return this._executionContext.process.stdout.read();
};

module.exports = JsHtml;