var util = require("util"),
	stream = require('stream');

util.inherits(StdOutWritable, stream.Writable);
function StdOutWritable() {
	stream.Writable.call(this, {
		decodeStrings: false,
		objectMode: true
	});
	
	this._reset();
}

StdOutWritable.prototype._reset = function() {
	this._buffer = '';
};

StdOutWritable.prototype._write = function(chunk, encoding, callback) {
	var error = undefined;
	try {
		if(typeof chunk != 'string') {
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
}

var _API_process = new _process();

module.exports = {
	process: _API_process,
	
	// Internal callbacks
	__render_end: function() { // Called after executing script for a render
		_API_process.stdout._reset();
	}
};