var util = require("util"),
	stream = require('stream');

function StdOutWritable() {
	stream.Writable.call(this, {
		decodeStrings: false,
		objectMode: true
	});
	
	this._reset();
}

util.inherits(StdOutWritable, stream.Writable);

StdOutWritable.prototype._reset = function() {
	this._buffer = '';
};

StdOutWritable.prototype._write = function(chunk, encoding, callback) {
	var error = undefined;
	try {
		if(typeof chunk !== 'string') {
			this._buffer += chunk.toString();
		}
		else {
			this._buffer += chunk;
		}
	}
	catch(e) {
		error = e;
	}
	finally {
		callback(error);
	}
};

StdOutWritable.prototype._getBuffer = function() {
	return this._buffer;
};

function _process() {
	this.stdout = new StdOutWritable();
	this.stderr = this.stdout; // Redirect stderr output to stdout
	this.version = process.version;
	this.versions = process.versions;
	this.config = process.config;
	this.arch = process.arch;
	this.platform = process.platform;
	this.nextTick = process.nextTick;
}

var _API_process = new _process();

function _console() {
}

_console.prototype.log = function() {
	_API_process.stdout.write(util.format.apply(util, arguments) + '\n');
};
_console.prototype.info = _console.prototype.log;

_console.prototype.error = function() {
	_API_process.stderr.write(util.format.apply(util, arguments) + '\n');
};
_console.prototype.warn = _console.prototype.error;

module.exports = {
	process: _API_process,
	console: new _console(),

	require: require, // Might actually be better to write a custom version of this
	Buffer: Buffer,
	
	// TODO: These need to be set correctly
	__filename: '[jshtml script]',
	__dirpath: '',
	
	/* These could be included, but clearTimeout will need security restrictions for safe use.
	setTimeout: setTimeout,
	setInterval: setInterval,
	clearTimeout: clearTimeout,
	*/
	
	// Internal callbacks
	__render_end: function() { // Called after executing script for a render
		_API_process.stdout._reset();
	}
};