var esprima = require('esprima');

var _ESPRIMA_FALSE_POSITIVE_ERROR_MESSAGE = 'Unexpected token ILLEGAL'; // I don't like this one bit. But Esprima doesn't have error codes (yet)

function sanitizeRaw(escapedStr) {
	return escapedStr
		.replace(/\\/gm, '\\\\')
		.replace(/\u0008/gm, '\\b')
		.replace(/\t/gm, '\\t')
		.replace(/\n/gm, '\\n')
		.replace(/\v/gm, '\\v')
		.replace(/\f/gm, '\\f')
		.replace(/\r/gm, '\\r')
		.replace(/\"/gm, '\\\"')
		.replace(/\'/gm, '\\\''); 
}

var EnumJsHtmlSection = {
	CodeBlockIndicators: [ // Defines the code block syntax to use. <[0] ...code... [1]> format
		[ '<?js', '?>' ],
		[ '<%', '%>' ]
	],
	BeginHtmlBlock: 'process.stdout.write(\'',
	EndHtmlBlock: '\');'
};

var EnumCompilerState = { // These match to EnumJsHtmlSection.CodeBlockIndicators as indicators of a sections end
	Normal:			0,
	Code:			1
};

module.exports = function(buffer) {
	var start = 0;
	var state = EnumCompilerState.Normal;
	var outBuffer = '';
	var previousError = undefined; // Used to throw an actual error when a false termination is suspected

	for(var i = 0; i <= buffer.length; i++) {
		for(var o = 0; o < EnumJsHtmlSection.CodeBlockIndicators.length; o++) {
			var u = i == buffer.length ? EnumJsHtmlSection.CodeBlockIndicators[o][state].length : 0; // Short circut the loop when at the end of the buffer and move straight to the processing.
			for(; u < EnumJsHtmlSection.CodeBlockIndicators[o][state].length; u++) {
				if(buffer[i + u] !== EnumJsHtmlSection.CodeBlockIndicators[o][state][u]) {
					break;
				}
			}
			if(u == EnumJsHtmlSection.CodeBlockIndicators[o][state].length) {
				if(state == EnumCompilerState.Normal) {
					state = EnumCompilerState.Code;
					
					var text = buffer.slice(start, i);
					if(text.trim() !== '') {
						outBuffer += EnumJsHtmlSection.BeginHtmlBlock + sanitizeRaw(text) + EnumJsHtmlSection.EndHtmlBlock;
					}
				}
				else {
					var codeBlock = buffer.slice(start, i);
					try {
						esprima.parse(codeBlock, {
							loc: true
						});
						previousError = undefined;
					}
					catch(e) {
						if(previousError) { // The false positive turned out to be true.
							throw previousError;
						}
						else if(e.description == _ESPRIMA_FALSE_POSITIVE_ERROR_MESSAGE) {
							previousError = e;
							continue;
						}
						else {
							throw e;
						}
					}
					
					outBuffer += buffer.slice(start, i);
					state = EnumCompilerState.Normal;
				}
				
				start = i += u;
				break;
			}
		}
	}
	return outBuffer;
};