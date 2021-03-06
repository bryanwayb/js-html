#! /usr/bin/env node
'use strict';

var helpout = require('helpout'),
    npmPackage = require('../package.json'),
    jshtml = require('../lib/index.js'),
    path = require('path'),
    fs = require('fs');

var args = require('minimist')(process.argv.slice(2));

if(args.v || args.version) {
    process.stdout.write(helpout.version(npmPackage));
}

if(args.h || args.help || (process.argv.length <= 2 && process.stdin.isTTY)) {
    process.stdout.write(helpout.help({
        npmPackage: npmPackage,
        usage: [
            '[files] [options] .. or',
            '[options] -- [files]'
        ],
        sections: {
            Options: {
                options: {
                    '-r, --render': 'Render the compiled output instead of stopping after compilation.',
                    '-a, --async': 'Render the JsHtml script asynchronously.',
                    '-o, --out': 'Write output to file instead of stdout.',
                    '--syntax': 'Enables syntax checking.',
                    '--format': 'By default compiled code has no formatting applied. This switch enables formatting. Implies --syntax.',
                    '--mangle': 'Turns on obfuscation for compiled code. Implies --format.',
                    '--optimize': 'Enables compiled script optimization. Implies --format.',
                    '--minify': 'Minify compiled output. Implies --mangle.',
                    '-v, --version': 'Prints the version/author info in the output header',
                    '-h, --help': 'Prints this help information.'
                }
            }
        }
    }));
    process.exit();
}

var outputStream = process.stdout;
var outputFile = args.o || args.out;
if(outputFile && typeof outputFile === 'string') {
    try {
        outputStream = fs.createWriteStream(outputFile);
    }
    catch(ex) {
        console.error('Unable to open output file ' + outputFile);
    }
}

var render = args.r || args.render,
    files = args._,
    len = files.length,
    beforeCompile = len > 1 ? '(function(){' : '',
    afterCompile = len > 1 ? '})()' : '',
    script = jshtml.script({
        syntaxCheck: args.syntax || render || false,
        format: args.format || false,
        mangle: args.mangle || false,
        optimize: args.optimize || false,
        minify: args.minify || false
    });

function processScript() {
    try {
        if(render) {
            if(args.a || args.async) {
                process.nextTick(function() {
                    script.render(function(rendered) {
                        outputStream.write(rendered + '\n');
                    });
                });
            }
            else {
                outputStream.write(script.render() + '\n');
            }
        }
        else {
            outputStream.write(beforeCompile + script.compile() + afterCompile + '\n');
        }
    }
    catch(ex) {
        console.log(ex.toString());
    }
}

for(var i = 0; i < len; i++) {
    script.setScriptFile(path.resolve(process.cwd(), files[i]));
    processScript();
}

var buffer = '';
process.stdin.on('readable', function() {
    var chunk = this.read();
    if(chunk != null) {
        buffer += chunk;
    }
    else {
        if(!buffer) {
            if(len === 0) {
                console.error('Error: No input files');
                process.exit(1);
            }
            else {
                process.exit();
            }
        }
    }
});
process.stdin.on('end', function() {
    script.setScript(buffer);
    processScript();
});