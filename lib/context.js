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
    this._buffer += chunk.toString();
    callback();
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

function Console(_process) {
    this._process = _process;
}

var inspectOptions = {
    showHidden: true,
    colors: false
};
Console.prototype.log = function(obj) {
    this._process.stdout.write((obj !== undefined ? (obj !== null ? (typeof obj === 'string' ? util.format.apply(util, arguments) : util.inspect(obj, inspectOptions)) : 'null') : 'undefined') + '\n');
};
Console.prototype.info = Console.prototype.log;
Console.prototype.error = Console.prototype.log; // Point to .log since we're not doing anything special with error output. This may change someday.
Console.prototype.warn = Console.prototype.error;

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
    var _AccessibleClearTimeoutIDs = [];
    var _API_process = new Process();
    return {
        process: _API_process,
        console: new Console(_API_process),

        Buffer: Buffer,

        // Set these to undefined by default
        __dirname: '[unknown]',
        __filename: '[unknown]',

        // Shimmed for security purposes
        setTimeout: function(callback, timeout) {
            var handleID = setTimeout(function() {
                callback();
                clearTimeout(handleID);
            }, timeout);
            _AccessibleClearTimeoutIDs.push(handleID);
            return handleID;
        },
        setInterval: function(callback, timeout) {
            var handleID = setInterval(callback, timeout);
            _AccessibleClearTimeoutIDs.push(handleID);
            return handleID;
        },
        clearTimeout: function(handleID) {
            var index = _AccessibleClearTimeoutIDs.indexOf(handleID);
            if(index !== -1) {
                _AccessibleClearTimeoutIDs.splice(index, 1);
                clearTimeout(handleID);
            }
        },

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
