// These are very, very loose implementations of the offical API equivalents.
function StdOutStreamShim() {
	this._buffer = '';
}

StdOutStreamShim.prototype.write = function(buffer) {
	this._buffer += buffer;
};

StdOutStreamShim.prototype.read = function() {
	return this._buffer;
};

function _process() {
	this.stdout = new StdOutStreamShim();
}

module.exports = {
	process: new _process() // Stand in for 'process' in the VM context
};