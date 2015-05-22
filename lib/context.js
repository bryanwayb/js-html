// These are very, very loose implementations of the offical API equivalents.
function StdOutStreamShim() {
	this.reset();
}

StdOutStreamShim.prototype.reset = function() {
	this._buffer = '';
};

StdOutStreamShim.prototype.write = function(buffer) {
	this._buffer += buffer;
};

StdOutStreamShim.prototype.read = function() {
	return this._buffer;
};

function _process() {
	this.stdout = new StdOutStreamShim();
}

var processShim = new _process();

module.exports = {
	process: processShim, // Stand in for 'process' in the VM context
	
	// Internal callbacks
	__render_begin: function() { // Called before executing script for a render
		processShim.stdout.reset();
	}
};