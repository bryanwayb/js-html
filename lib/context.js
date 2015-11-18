'use strict';

var util = require('util'),
	stream = require('stream'),
	path = require('path'),
	_module = require('module');

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
    var error;
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

function Process() {
    this.stdout = new StdOutWritable();
    this.stderr = this.stdout; // Redirect stderr output to stdout
    this.version = process.version;
    this.versions = process.versions;
    this.config = process.config;
    this.arch = process.arch;
    this.platform = process.platform;
    this.nextTick = process.nextTick;
}

var _API_process = new Process();

function _console() {
}

_console.prototype.log = function(obj) {
    _API_process.stdout.write(
        (obj !== undefined ? (obj !== null ? (typeof obj === 'string' ? util.format.apply(util, arguments) : util.inspect(obj, {
            showHidden: true,
            colors: false
        })) : 'null') : 'undefined') + '\n');
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
    if(index !== -1) {
        _AccessibleClearTimeoutIDs.splice(index, 1);
        clearTimeout(handleID);
    }
}

// Basically takes the place of Module.prototype._compile, with some features stripped out
function makeRequire(m, self) {
    function _require(_path) {
        return m.require(_path);
    }

    _require.resolve = function(request) {
        return _module._resolveFilename(request, self);
    };
    _require.cache = _module._cache;
    _require.extensions = _module._extensions;

    return _require;
}

module.exports = function() {
    return {
        process: _API_process,
        console: new _console(),

        Buffer: Buffer,

        // Set these to undefined by default
        __dirname: undefined,
        __filename: undefined,

        // Shimmed for security purposes
        setTimeout: _setTimeout,
        setInterval: _setInterval,
        clearTimeout: _clearTimeout,

        // Create a native module object
        module: new _module('[jshtml]'),

        // Internal fucntions
        __render_end: function() { // Called after executing script for a render
            _API_process.stdout._reset();
        },
        __init_script: function(filename) {
            // Arr, here be a salty sea we sailin'. That's pirate for look out for issues with the below code.
            // Most of the stuff here is handled by NodeJS in the source, and could cause problems that don't exist in other versions.

            if(filename) {
                this.__dirname = path.dirname(filename);
                this.__filename = filename;

                this.module.filename = this.module.id = filename;
                this.module.paths = _module._nodeModulePaths(this.__dirname);
            }

            this.module.loaded = true;
            this.require = makeRequire(this.module, this);
        }
    };
};
