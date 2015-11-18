'use strict';

var vm = require('vm'),
    fs = require('fs'),
    compile = require('./compile.js');

var createContextObject = require('./context.js');

function JsHtml(script, options) {
    if(!options && typeof script !== 'string') {
        options = script;
    }
    else if(script) {
        this.setScript(script);
    }

    this._options = options || { };
}

JsHtml.prototype.setScript = function(script) {
    this.clear();
    this._script = script;
    this._sourceCompiled = false;
};

JsHtml.prototype.setScriptFile = function(filepath) {
    this.setScript(fs.readFileSync(filepath).toString());
    if(!this._options.filename) {
        this._options.filename = filepath;
    }
};

JsHtml.prototype.clear = function() {
    this._script = this._sourceCompiled = this._function =
        this._context = undefined;
};

JsHtml.prototype.compile = function() {
    var script = this._script;
    if(!this._sourceCompiled && script) {
        this._script = script = compile(script);
        this._sourceCompiled = true;
    }
    return script;
};

JsHtml.prototype._makeContext = function() {
    var context = this._context;
    if(!context) {
        context = createContextObject();

        var additionalContext = this._options.context;
        if(additionalContext) {
            for(var property in additionalContext) {
                if(additionalContext.hasOwnProperty(property)) {
                    context[property] = additionalContext[property];
                }
            }
        }

        this._context = context = vm.createContext(context);
    }
    return context;
};

JsHtml.prototype.makeFunction = function() {
    var func = this._function;
    if(!func) {
        var script = this.compile();
        if(typeof script === 'string') {
            var context = this._makeContext();
            var exec = vm.runInContext('(function(){' + script + '});', context);

            context.__init_script(this._options.filename || __filename);

            this._function = func = function() {
                exec();
                var scriptOutput = context.process.stdout._buffer;
                context.__render_end();
                return scriptOutput;
            };
        }
    }
    return func;
};

JsHtml.prototype.render = function() {
    var func = this.makeFunction(),
        ret;
    if(func) {
        ret = func();
    }
    return ret;
};

module.exports = function(script, options) {
    return new JsHtml(script, options);
};