[![Build Status](https://img.shields.io/travis/bryanwayb/js-html.svg)](https://travis-ci.org/bryanwayb/js-html) [![Release Version](https://img.shields.io/github/release/bryanwayb/js-html.svg)](https://github.com/bryanwayb/js-html/releases) [![Code Coverage](https://img.shields.io/codecov/c/github/bryanwayb/js-html.svg)](https://codecov.io/github/bryanwayb/js-html) [![Codacy Grade](https://img.shields.io/codacy/d22a37360df842f9aeb3a9705379647a.svg)](https://www.codacy.com/app/bryanwayb/js-html) [![License](https://img.shields.io/github/license/bryanwayb/js-html.svg)](https://github.com/bryanwayb/js-html/blob/master/LICENSE) 

A module for loading and compiling markup infused scripts.

#Library Use
The `js-html `library has two main components, the `compile()` function and the `JsHtml` object.

```JavaScript
var jsHtmlModule = require("js-html"); // Exports compile and JsHtml
```

###JsHtml
The `JsHtml` is the worker object, where most of the processing is performed. It's responsible for taking the output of `compile()` and putting it to work. (See below for `compile()` usage).

The object is initialized with the following arguments:

```Javascript
new JsHtml([filepath [, options]]);
    /*
        options: {
            encoding: "utf8"    // The encoding to use when working with Buffers
        }
    */
```

These are the functions that are available:

```Javascript
JsHtml.loadFile(filepath) // Loads a file and prepares internal buffers for compilation
JsHtml.reloadFile() // Forces the currently loaded file to be reloaded.
JsHtml.closeFile() // Closes the current file and resets the internal buffer
JsHtml.loadBuffer(buffer) // Load passed buffer (string or Buffer object)
JsHtml.reset() // Resets the internal buffer, compiled script, and VM context.
JsHtml.compile() // Actually compiles the code taking into account buffer source.
JsHtml.compileVM() // Calls `JsHtml.compile()`, creates a security context model, and returns a VM function.
JsHtml.render() // Compiles, loads, and executes the loaded buffer. Returns the rendered string.
```
####Example

The following will take an input script, compile and render it, then save the rendered version into an `.html` file.

#####index.js:
```JavaScript
var fs = require('fs'),
	JsHtml = require('js-html').JsHtml;

var script = new JsHtml('./script.jshtml');
fs.writeFileSync('./rendered.html', script.render());
```

#####script.jshtml
```HTML
<html>
	<head>
		<title>Example JsHtml Page</title>
	</head>
	<body>
		<h1>Example JsHtml Page</h1>
		<p><?js process.stdout.write('This is being written to the page via process.stdout.write()'); ?></p>
	</body>
</html>
```

###compile
The `compile()` function is used to transform plain text and inline code into a valid, executable JavaScript string. Here is a basic example:

```JavaScript
console.log(compile("A plain string of text"));
// Output:
//      process.stdout.write("A plain string of text");
```

The above example is pretty boring. To make things a bit more interesting, we can add sections of JavaScript code to be factored into the compilation. `Code blocks` are defined with the following syntax:

 * `<?js /* JavaScript code goes here */ ?>`
 * `<% /* More JavaScript code */ %>`

Here's an example with a code block:

```Javascript
console.log(
    compile("Inline JavaScript Example: <?js process.stdout.write('Generated inside JavaScript');")
);
// Output:
//      process.stdout.write('Inline JavaScript Example: '); process.stdout.write('Generated inside JavaScript');
```

The `compile()` execution path is fairly straightforward, code embeddable markup gets passed, compiled JavaScript is returned.

****

###Installing

**npm**
```Bash
npm install js-html
```

**git**
```Bash
git clone https://github.com/bryanwayb/js-html.git
cd js-html
npm install
```

###Running Tests

`js-html` has been configured for numerous tests to test compatibility with a specific JavaScript engine. If you would like to run these tests run the below command while in the modules root directory:

```Bash
npm test
```