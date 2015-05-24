var esprima = require('esprima');

// I don't like these one bit. But Esprima doesn't have error codes (yet)...
var _ESPRIMA_FALSE_POSITIVE_ERROR_MESSAGE			= 'Unexpected token ILLEGAL';
var _ESPRIMA_CONTINUING_END_BLOCK_ERROR_MESSAGE		= 'Unexpected end of input';
var _ESPRIMA_CONTINUING_START_BLOCK_ERROR_MESSAGE	= 'Unexpected token }';

var _COMPILE_OUTPUT_FUNCTION = 'process.stdout.write';

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
	CodeBlockIndicators: [ // Defines the code block syntax to use. [0] ...code... [1] format. [2] = Direct print shortcut (e.g ) [0][2]...value to be passed to print function...[1]
		[ '<?js', '?>', ':' ],
		[ '<%', '%>', '=' ]
	],
	BeginHtmlBlock: _COMPILE_OUTPUT_FUNCTION + '(\'',
	EndHtmlBlock: '\');',
	BeginCodeDirectPrint: _COMPILE_OUTPUT_FUNCTION + '(',
	EndCodeDirectPrint: ');'
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
	var codeBlockEntryIndex = 0;

	for(var i = 0; i <= buffer.length; i++) {
		for(var o = 0; o < EnumJsHtmlSection.CodeBlockIndicators.length; o++) {
			var u = 0;
			if(i === buffer.length) { // Short circut the loop when at the end of the buffer and move straight to the processing.
				u = EnumJsHtmlSection.CodeBlockIndicators[o][state].length;
				o = codeBlockEntryIndex;
			}
			
			for(; u < EnumJsHtmlSection.CodeBlockIndicators[o][state].length; u++) {
				if(buffer[i + u] !== EnumJsHtmlSection.CodeBlockIndicators[o][state][u]) {
					break;
				}
			}
			if(u === EnumJsHtmlSection.CodeBlockIndicators[o][state].length) {
				if(state === EnumCompilerState.Normal) {
					state = EnumCompilerState.Code;
					codeBlockEntryIndex = o;
					
					var text = buffer.slice(start, i);
					
					if(text.trim() !== '') {
						outBuffer += EnumJsHtmlSection.BeginHtmlBlock + sanitizeRaw(text) + EnumJsHtmlSection.EndHtmlBlock;
					}
				}
				else {
					var openingCharacter = buffer[start - 1];
					var printShortcut = openingCharacter === EnumJsHtmlSection.CodeBlockIndicators[codeBlockEntryIndex][2];
					if(printShortcut) {
						outBuffer += EnumJsHtmlSection.BeginCodeDirectPrint;
					}
					else if((' \t\n\r\v').indexOf(openingCharacter) === -1) {
						state = EnumCompilerState.Normal;
						start -= EnumJsHtmlSection.CodeBlockIndicators[o][0].length + 1;
						break;
					}
					
					var codeBlock = buffer.slice(start, i);

					try {
						esprima.parse(codeBlock, {
							loc: true
						});
						
						if(previousError && previousError.description !== _ESPRIMA_CONTINUING_END_BLOCK_ERROR_MESSAGE) {
							previousError = undefined;
						}
					}
					catch(e) {
						if(previousError) {
							if(previousError.description === _ESPRIMA_CONTINUING_END_BLOCK_ERROR_MESSAGE && e.description === _ESPRIMA_CONTINUING_START_BLOCK_ERROR_MESSAGE) {
								previousError = undefined;
							}
							else { // The false positive turned out to be true.
								throw previousError;
							}
						}
						else if(e.description === _ESPRIMA_FALSE_POSITIVE_ERROR_MESSAGE) {
							previousError = e;
							break;
						}
						else if(e.description === _ESPRIMA_CONTINUING_END_BLOCK_ERROR_MESSAGE) {
							previousError = e;
						}
						else {
							throw e;
						}
					}
					
					outBuffer += buffer.slice(start, i);
					
					if(printShortcut) {
						outBuffer += EnumJsHtmlSection.EndCodeDirectPrint;
					}
					
					state = EnumCompilerState.Normal;
					u--;
				}
				
				start = (i += u) + 1;
				break;
			}
		}
	}
	
	if(previousError) { // Ensures we didn't miss any exceptions
		throw previousError;
	}
	
	return outBuffer;
};