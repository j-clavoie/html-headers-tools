// Set required modules
const vscode = require('vscode');
const JSDOM = require('jsdom').JSDOM;
const genFunc = require('./genericFunctions');

// Create a new Collection for Diagnostics
// A Diagnostics Collection must be outsides of an function.
const ddpd_headers_diagColl = vscode.languages.createDiagnosticCollection("html-headers-tools");


/** activate
 * This method is called when your extension is activated
 * your extension is activated the very first time the command is executed
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	/** ***************************************************
	 * Method to validate ID structure
	 * ****************************************************/
	let validate_headers = vscode.commands.registerCommand('html-headers-tools.validate_headers', function () {

		// Get the active text editor
		const myEditor = genFunc.getActiveEditor();
		if (myEditor == false) {
			return;
		}

		// Retrieve the part of text to use in the Active Text Editor
		// If text selected then it will be used, if not, the whole content is used
		const theRange = genFunc.getRangeSelected(true);

		// Create a DOM from the selected text in active editor
		let myDOM = new JSDOM(myEditor.document.getText(theRange), { includeNodeLocations: true, contentType: "text/html" });

		// Validate if headers respect the hierarchy and add error in "Problem" panel view
		validateHeader(myDOM);
	});



	/** ***************************************************
	 * Method to set or reset IDs of headers
	 * A popup request the end level to set
	 * ****************************************************/
	let set_headers_ids = vscode.commands.registerCommand('html-headers-tools.set_headers_ids', async function () {

		// Get the active text editor
		const myEditor = genFunc.getActiveEditor();
		if (myEditor == false) {
			return;
		}

		// Retrieve the part of text to use in the Active Text Editor
		// If text selected then it will be used, if not, the whole content is used
		const theRange = genFunc.getRangeSelected(true);

		// Create a DOM from the selected text in active editor
		let myDOM = new JSDOM(myEditor.document.getText(theRange), { includeNodeLocations: true, contentType: "text/html" });

		// Validate if headers respect the hierarchy and add error in "Problem" panel view
		let myDOMHeaders = validateHeader(myDOM);
		if (myDOMHeaders == undefined || myDOMHeaders == false) {
			return;
		}

		// check if header(s) have IDs.
		// If yes, then exit.
		if (await areTherePreviousHeadersIDs(myDOMHeaders)) {
			return;
		}

		// Try to set new ID to each headers in the DOM
		await setNewIDs(myDOMHeaders)

		// Set the new headers ID
		genFunc.updateEditor(myDOM.window.document.getElementsByTagName('body')[0].innerHTML, theRange);
	});



	/** ***************************************************
	 * Method to create the list for the table of content
	 * ****************************************************/
	let create_toc = vscode.commands.registerCommand('html-headers-tools.create_toc', function () {

		// Get the active text editor
		const myEditor = genFunc.getActiveEditor();
		if (myEditor == false) {
			return;
		}

		// Retrieve the part of text to use in the Active Text Editor
		// If text selected then it will be used, if not, the whole content is used
		const theRange = genFunc.getRangeSelected(true);

		// Create a DOM from the selected text in active editor
		let myDOM = new JSDOM(myEditor.document.getText(theRange), { includeNodeLocations: true, contentType: "text/html" });

		// Validate if headers respect the hierarchy and add error in "Problem" panel view
		let myDOMHeaders = validateHeader(myDOM);
		if (myDOMHeaders == undefined || myDOMHeaders == false) {
			return;
		}

		// check if header(s) have IDs.
		// If no, then exit.
		if (areTherePreviousHeadersIDs(myDOMHeaders, false)) {
			// Create the HTML code of nested LIST (UL/LI)
			const htmlList = createHTMLList(myDOMHeaders);

			if (htmlList != '' && htmlList != null) {
				// Get the selected text/position where to add the list
				const ToCPlace = getTextSelected();

				// Put the HTML list in the editor at cursor place
				genFunc.updateEditor(htmlList, ToCPlace);
			} else {
				vscode.window.showWarningMessage("Impossible to create a list because headers have no IDs.");
			}
		}
	});

	// add main function to context array
	context.subscriptions.push(create_toc);
	context.subscriptions.push(validate_headers);
	context.subscriptions.push(set_headers_ids);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

/* ############################################################################ */
/* ############################################################################ */
/* ############################################################################ */
/* ############################################################################ */

/**
 * 
 * @param {JSDOM} DOMheaders DOM that contains Headers from H2 to H6
 * This function create the HTML code of nested list
 * Return a string that contains the HTML code to put in an UL
 */
function createHTMLList(DOMheaders) {
	// sub-function to add closing LI and UL
	function closingEndList(tmpPrev, tmpCur) {
		let nbLevel = 0;
		nbLevel = tmpPrev - tmpCur;
		for (let i = 0; i < nbLevel; i++) {
			htmlResult += '</ul>\n</li>\n';
		}
	}

	// Variables initialization
	let prev = 2;
	let cur = 0;
	let htmlResult = '';

	// Process each item in the array passed in parameters
	DOMheaders.forEach(function (elem) {
		const elemID = elem.getAttribute("id");
		if (elemID != null && elemID != undefined && elemID != '') {
			// Get only the header's level number
			cur = parseInt(elem.tagName.match(/h(\d)/i)[1]);

			// Compare the current header's level with the previous header's level
			// Apply the right action based on greater/lower than previous 
			if (cur > prev) {
				if (htmlResult !== '') {
					htmlResult = htmlResult.replace(/<\/li>\n$/, '\n');
				}
				htmlResult += '<ul>\n';
			} else if (cur < prev) {
				closingEndList(prev, cur);
			}

			// Adding LI with the link
			htmlResult += '<li><a href="#' + elem.getAttribute("id") + '">' + elem.innerHTML + '</a></li>\n';

			// set the previous level with the current value for the next iteration
			prev = cur;
		}
	});

	// Close all opened LI and UL at the end of the list
	closingEndList(prev, 2);

	// Return the righ value.
	return htmlResult;
}


/**
 * Method to validate and get Headers, and to add Diagnostics to Problems Tab view if problems occur.
 * @param {JSDOM} myDOM JSDOM
 * Return: A sub-DOM that contains all headers (h2 to h6)
 * 			   false - if error is present in the headers hierarchy
 * 				 undefined - if no headers exist in the DOM passed in parameter
 */
function validateHeader(myDOM) {
	let Result = true;

	// Clear previous diagnostics.
	ddpd_headers_diagColl.clear();

	// Create the array that store all Diagnoctics found in code
	let allDiags = [];

	// Retrieves all Headers in DOM (from h2 to h6 inclusively)
	const headers = myDOM.window.document.querySelectorAll("h2,h3,h4,h5,h6");

	if (headers.length == 0) {
		vscode.window.showErrorMessage("No header found in the text selected/whole text in editor.");
		return undefined;
	}

	// set the function's return value with the sub-DOM that contains headers
	Result = headers

	// Set initiale value for the first header's level
	let prev = 2;

	// Compare each Headers
	headers.forEach(function (elem) {
		// Get only the header's level number
		let curLevel = elem.tagName.match(/h(\d)/i)[1];
		curLevel = parseInt(curLevel);

		// If current is greater than previous AND gap is more than 1 = ERROR
		if (curLevel > prev && curLevel - prev > 1) {
			// Set the return value to False
			Result = false;

			// Get the node location
			const nodeElem = myDOM.nodeLocation(elem);
			// Set the range of text the header in error
			const diagErrorRange = new vscode.Range(
				nodeElem.startTag.startLine - 1,
				nodeElem.startTag.startCol - 1,
				nodeElem.startTag.endLine - 1,
				nodeElem.startTag.endCol - 1);

			// Add the current diagnostic to the array of all diagnostics
			allDiags.push(
				{
					code: "",
					message: "This header passed over the serie. It must be <h" + (prev + 1) + "> or higher level instead of <h" + curLevel + ">",
					range: diagErrorRange,
					severity: vscode.DiagnosticSeverity.Warning,
					source: 'DDPD - Headers - Validation'
				}
			);
		}
		// Set the previous to the current
		prev = curLevel;
	});

	if (allDiags.length > 0) {
		// Display all diagnostics fournd in the Problems tab view.
		ddpd_headers_diagColl.set(vscode.window.activeTextEditor.document.uri, allDiags);
	}

	// If an error has been found in the hierarchy of headers, then display an error message
	if (Result == false) {
		vscode.window.showErrorMessage("The headeres hierarchy is invalid. Check the 'Problems' tab view for details.");
	}

	return Result;
}



/**
 * Method to check if headers passed in parameters already have ID
 * @param {JSDOM} myDOMHeaders DOM array that contains only headers (h2 to h6)
 */
async function areTherePreviousHeadersIDs(myDOMHeaders, askQuestion = true) {
	// Define the default return value to false (no id already present)
	let alreadyIDs = false;

	// Check each headers, if ID is set than change the return value to TRUE (ID exists)
	myDOMHeaders.forEach(function (value) {
		if (value.getAttribute("id") != null && value.getAttribute("id") != '') {
			alreadyIDs = true;
		}
	});

	// If at least one header already has ID, ask a question to user 
	// to validate if the process must continue or not (by default yes)
	if (askQuestion && alreadyIDs) {
		// Define message option
		let options = vscode.InputBoxOptions = {
			ignoreFocusOut: true,
			prompt: "At least one header already has an ID. So, do you want to reset all headers ID?",
			value: "Yes"
		};

		// Display message and if the answer is anything else than YES
		// the process is stop now.comment
		// If yes is selected by user then continue
		await vscode.window.showInputBox(options).then(value => {
			if (value.toLowerCase() == 'yes') {
				alreadyIDs = false;
			}
		});
	}

	return alreadyIDs;
}



/**
 * Method to create and set ID to headers passed in parameters
 * @param {JSDOM} myDOMHeaders DOM array that contains only headers from h2 to h6
 */
async function setNewIDs(myDOMHeaders) {
	let newid = "h";
	let b = 0;
	let c = 0;
	let d = 0;
	let e = 0;
	let f = 0;

	// Ask to user the beginning string of new headers
	let options = vscode.InputBoxOptions = {
		ignoreFocusOut: true,
		prompt: "Define the beginning string of IDs?",
		value: "h"
	};

	// Display message to ask the beginngin string of new headers
	
	await vscode.window.showInputBox(options).then(value => {
		if (value == undefined) {
			newid = undefined;
		} else {
			newid = value.toLowerCase();
		}
	});
	// If Escape key has been used in the inputbox then exit (do nothing)
	if (newid == undefined){
		return;
	}

	// Process to set new ID to Headers
	let prevlev = 0;
	myDOMHeaders.forEach(function (value) {
		const intLevel = parseInt( value.tagName.match(/h(\d)/i)[1] );
		switch (intLevel) {
			case 2:
				if (prevlev < intLevel) {
					b = 0;
				}
				b++;
				value.setAttribute("id", newid + '_' + b);
				break;
			case 3:
				if (prevlev < intLevel) {
					c = 0;
				}
				c++;
				value.setAttribute("id", newid + '_' + b + '_' + c);
				break;
			case 4:
				if (prevlev < intLevel) {
					d = 0;
				}
				d++;
				value.setAttribute("id", newid + '_' + b + '_' + c + '_' + d);
				break;
			case 5:
				if (prevlev < intLevel) {
					e = 0;
				}
				e++;
				value.setAttribute("id", newid + '_' + b + '_' + c + '_' + d + '_' + e);
				break;
			case 6:
				if (prevlev < intLevel) {
					f = 0;
				}
				f++;
				value.setAttribute("id", newid + '_' + b + '_' + c + '_' + d + '_' + e + '_' + f);
				break;
		}
		prevlev = intLevel;
	});
}