var util = require("util"),
	stream = require('stream'),
	path = require('path');

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

_console.prototype.log = function(obj) {
	_API_process.stdout.write((obj ? (
		typeof obj === 'string' ? util.format.apply(util, arguments) : util.inspect(obj, {
				showHidden : true, 
				colors: false
			})
	) : 'undefined') + '\n');
};
_console.prototype.info = _console.prototype.log;
_console.prototype.error = _console.prototype.log; // Point to .log since we're not doing anything special with error output. This may change someday.
_console.prototype.warn = _console.prototype.error;

var _AccessibleClearTimeoutIDs = [];

function _setTimeout(callback, timeout) {
	var handleID = setTimeout(callback, timeout);
	_AccessibleClearTimeoutIDs.push(handleID);
	return handleID;
}

function _setInterval(callback, timeout) {
	var handleID = setInterval(callback, timeout);
	_AccessibleClearTimeoutIDs.push(handleID);
	return handleID;
}

function _clearTimeout(handleID) {
	var index = _AccessibleClearTimeoutIDs.indexOf(handleID);
	if(index != -1) {
		_AccessibleClearTimeoutIDs.splice(index, 1);
		clearTimeout(handleID);
	}
}

function _require(path) {
	return require(_require.resolve(path));
}
_require.resolve = function(path) {
	// This section will need some work eventually... but in due time, once there's a more defined method of setting "include" paths, prioritization of loading, and what have you.
	// So for now, let's just return the path that was given to use
	return require.resolve(path);
}
_require.extensions = require.extensions;

module.exports = {
	process: _API_process,
	console: new _console(),

	require: _require, // Might actually be better to write a custom version of this
	Buffer: Buffer,
	
	// Set these to undefined by default
	__dirname: undefined,
	__filename: undefined,
	
	setTimeout: _setTimeout,
	setInterval: _setInterval,
	clearTimeout: _clearTimeout,
	
	// Internal fucntions
	__render_end: function() { // Called after executing script for a render
		_API_process.stdout._reset();
	},
	__set_filename: function(filename) {
		module.exports.__filename = filename;
		module.exports.__dirname = filename && path.isAbsolute(filename) ? path.dirname(filename) : undefined;
	}
};