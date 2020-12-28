// Set required modules
const vscode = require('vscode');
const JSDOM = require('jsdom').JSDOM;
const genFunc = require('./genericFunctions');

// Create a new Collection for Diagnostics
// A Diagnostics Collection must be outsides of an function.
const headers_diagColl = vscode.languages.createDiagnosticCollection("html-headers-tools");
// Use to clear the "Problems" Tab when we close the file
vscode.workspace.onDidCloseTextDocument(function (listener) {
	// clear all previous diagnostics of the closed editor
	headers_diagColl.delete(listener.uri);
	headers_diagColl.set(listener.uri, undefined);
});


/** activate
 * This method is called when your extension is activated
 * your extension is activated the very first time the command is executed
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let validate_headers = vscode.commands.registerCommand('html-headers-tools.validate_headers', function () {
		if (!genFunc.isHTMLcode()) {
			vscode.window.showErrorMessage('This extension is for HTML file only.');
			return;
		}
		// Validate headers
		validateAllHeaders();
	});

	let set_headers_ids = vscode.commands.registerCommand('html-headers-tools.set_headers_ids', async function () {
		if (!genFunc.isHTMLcode()) {
			vscode.window.showErrorMessage('This extension is for HTML file only.');
			return;
		}
		// Set/Reset IDs
		setHeadersIDs();
	});

	let create_toc = vscode.commands.registerCommand('html-headers-tools.create_toc', function () {
		if (!genFunc.isHTMLcode()) {
			vscode.window.showErrorMessage('This extension is for HTML file only.');
			return;
		}
		// Create nested list for Table of contents
		createToC();
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

/**********************************************************************************************
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


/**********************************************************************************************
 * Method to validate and get Headers, and to add Diagnostics to 
 * Problems Tab view if problems occur.
 * @param {JSDOM} myDOM JSDOM
 * Return: A sub-DOM that contains all headers (h2 to h6)
 * 			   false - if error is present in the headers hierarchy
 * 				 undefined - if no headers exist in the DOM passed in parameter
 */
function validateHeader(myDOM) {

	// Create the array that store all Diagnoctics found in code
	let allDiags = [];

	// Retrieves all Headers in DOM (from h2 to h6 inclusively)
	const headers = myDOM.window.document.querySelectorAll("h2,h3,h4,h5,h6");

	if (headers.length == 0) {
		vscode.window.showErrorMessage("No header found in the text selected/whole text in editor.");
		return undefined;
	}

	// Set initiale value for the first header's level
	let prev = 2;

	// Compare each Headers
	headers.forEach(function (elem) {
		// Get only the header's level number
		let curLevel = elem.tagName.match(/h(\d)/i)[1];
		curLevel = parseInt(curLevel);

		// If current is greater than previous AND gap is more than 1 = ERROR
		if (curLevel > prev && curLevel - prev > 1) {
			// Get the node location
			const diagErrorRange = genFunc.getDOMelementPosition(myDOM, elem);

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
		headers_diagColl.set(vscode.window.activeTextEditor.document.uri, allDiags);
	}
}



/**********************************************************************************************
 * Method to check if headers passed in parameters already have ID
 * @param {JSDOM} myDOMHeaders DOM array that contains only headers (h2 to h6)
 * return true (IDs already exist) or false (no IDs already exist)
 */
async function areTherePreviousHeadersIDs(myDOMHeaders, askQuestion = true) {
	// Define process variables
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
		// Option for the dropdown popup
		const options = vscode.QuickPickOptions = {
			placeHolder: "Header(s) in selection already has an ID. Do you want to reset/replace all headers ID in selection?",
			canPickMany: false,
			ignoreFocusOut: true,
			matchOnDescription: true,
			matchOnDetail: true
		};

		// Display the dropdown popup to user
		const wantToResetIDs = await vscode.window.showQuickPick(["Yes", "No"], options);
		// If Escape key has been used = exit without any other process
		if (wantToResetIDs == undefined) {
			return null;
		}

		if (wantToResetIDs.toLowerCase() == 'yes') {
			alreadyIDs = false;
		}
	}

	// return True if IDs are existing. False if not IDs already exist
	return alreadyIDs;
}



/**********************************************************************************************
 * Method to create and set ID to headers passed in parameters
 * @param {JSDOM} myDOMHeaders DOM array that contains only headers from h2 to h6
 * @param {Array} previousIDs Array of all IDs already present in headers (default NULL)
 */
async function setNewIDs(myDOMHeaders, keepPreviousIDs = false) {
	let previousIDs;
	if (keepPreviousIDs) {
		previousIDs = getAlreadyExistingIDs(false);	// TODO: MUST INCLUDE IDs in selection
	} else {
		previousIDs = getAlreadyExistingIDs(true); // TODO: MUST EXCLUDE IDs in selection
	}

	// Get the prefix for new ID that will be created
	const newid = await getPrefixNewID();

	// Set variable for the process
	let b = 0;
	let c = 0;
	let d = 0;
	let e = 0;
	let f = 0;

	// Process to set new ID to Headers
	let prevlev = 0;
	let tmpID = '';
	myDOMHeaders.forEach(function (curHeader) {
		const curLevel = parseInt(curHeader.tagName.match(/h(\d)/i)[1]);
		let idAlreadyExists = true;
		while (idAlreadyExists) {
			switch (curLevel) {
				case 2:
					if (prevlev < curLevel) {
						b = 0;
					}
					b++;
					tmpID = newid + '_' + b;
					break;
				case 3:
					if (prevlev < curLevel) {
						c = 0;
					}
					c++;
					tmpID = newid + '_' + b + '_' + c;
					break;
				case 4:
					if (prevlev < curLevel) {
						d = 0;
					}
					d++;
					tmpID = newid + '_' + b + '_' + c + '_' + d;
					break;
				case 5:
					if (prevlev < curLevel) {
						e = 0;
					}
					e++;
					tmpID = newid + '_' + b + '_' + c + '_' + d + '_' + e;
					break;
				case 6:
					if (prevlev < curLevel) {
						f = 0;
					}
					f++;
					tmpID = newid + '_' + b + '_' + c + '_' + d + '_' + e + '_' + f;

					break;
			}

			// Check if temporary ID already exists in the DOM
			if (previousIDs.includes(tmpID)) {
				idAlreadyExists = true;
			} else {
				idAlreadyExists = false;
			}

			// If ID is not existing AND (the current header has no ID already set OR no need to keep previous ID)
			if (!idAlreadyExists && (curHeader.id == '' || keepPreviousIDs == false)) {
				// Add ID to the current header
				curHeader.setAttribute("id", tmpID);
			}

			// Define the previous header level with the current header level
			prevlev = curLevel;
		}
	});
	// Send a message to user to inform that process is completed
	vscode.window.showInformationMessage("Process completed!");
}





/**********************************************************************************************
 * 
 */
async function setHeadersIDs() {
	// Validate if headers respect the hierarchy and add error in "Problem" panel view
	await validateAllHeaders();
	// If error found, stop the current process
	if (headers_diagColl.get(vscode.window.activeTextEditor.document.uri).length > 0) {
		vscode.window.showErrorMessage("It's impossible to set/reset IDs. Check the 'Problems' tab for more detail.")
		return;
	}

	// Get the active text editor
	const myEditor = genFunc.getActiveEditor();
	if (myEditor == false) {
		return;
	}

	// Get the DOM from the selected part of code
	let myDOM = getDOM();

	// Get all headers in the DOM
	const myDOMHeaders = myDOM.window.document.querySelectorAll("h2,h3,h4,h5,h6");

	// check if header(s) have IDs.
	const keepPreviousIDs = await areTherePreviousHeadersIDs(myDOMHeaders);
	// Escape key has been used in the question to user then stop process
	if (keepPreviousIDs == null) {
		return;
	}
	await setNewIDs(myDOMHeaders, keepPreviousIDs);

	const theRange = genFunc.getRangeSelected(true);

	// Set the new headers ID
	genFunc.updateEditor(myDOM.window.document.getElementsByTagName('body')[0].innerHTML, theRange);
}


/**********************************************************************************************
 * 
 */
function createToC() {

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
			const ToCPlace = genFunc.getTextSelected();

			// Put the HTML list in the editor at cursor place
			genFunc.updateEditor(htmlList, ToCPlace);
		} else {
			vscode.window.showWarningMessage("Impossible to create a list because headers have no IDs.");
		}
	}
}


/**********************************************************************************************
 * 
 */
async function validateAllHeaders() {
	// Get the active text editor
	const myEditor = genFunc.getActiveEditor();
	// If no editor opened then exit without any action
	if (myEditor == false) {
		return;
	}

	// Define diagnostics collection for the current Editor and empty the list
	headers_diagColl.set(vscode.window.activeTextEditor.document.uri, []);
	// Clear previous diagnostics.
	headers_diagColl.clear();

	// Retrieve the part of text to use in the Active Text Editor
	// If text selected then it will be used, if not, the whole content is used
	const theRange = genFunc.getRangeSelected(true);

	// Create a DOM from the selected text in active editor
	let myDOM = new JSDOM(myEditor.document.getText(theRange), { includeNodeLocations: true, contentType: "text/html" });

	// Validate if headers respect the hierarchy and add error in "Problem" panel view
	await validateHeader(myDOM);
}



function getDOM(fromSelectionOnly = true) {
	let theRange;

	const myEditor = genFunc.getActiveEditor();

	if (fromSelectionOnly) {
		theRange = genFunc.getRangeSelected(true);
	} else {
		theRange = new vscode.Range(myEditor.document.positionAt(0), myEditor.document.positionAt(myEditor.document.getText().length));
	}

	// Create a DOM from the selected text in active editor
	let myDOM = new JSDOM(myEditor.document.getText(theRange), { includeNodeLocations: true, contentType: "text/html" });

	return myDOM;
}



/**
 * Method to retrieve all IDs already set in the whole code no matter kind of elem
 * because ID must be unique in the code
 * Return an array that contains all IDs in the code (whole active editor not only the selected text)
	*/
function getAlreadyExistingIDs(excludeIDsInSelection = false) {
	let previousIDs = [];
	const myWholeDOM = getDOM(false);

	// Get all headers in the DOM
	//const myWholeDOMHeaders = myWholeDOM.window.document.querySelectorAll("h2,h3,h4,h5,h6");
	const myWholeDOMIDs = myWholeDOM.window.document.querySelectorAll('*');

	myWholeDOMIDs.forEach(function (tNode) {
		if (tNode.id != '') {
			previousIDs.push(tNode.id);
		}
	});

	if (excludeIDsInSelection) {
		let selectionIDs = [];
		const mySelectionDOM = getDOM(true);

		// Get all headers in the DOM
		//const myWholeDOMHeaders = myWholeDOM.window.document.querySelectorAll("h2,h3,h4,h5,h6");
		const mySelectionDOMIDs = mySelectionDOM.window.document.querySelectorAll('*');

		mySelectionDOMIDs.forEach(function (tNode) {
			if (tNode.id != '') {
				selectionIDs.push(tNode.id);
			}
		});
		previousIDs = previousIDs.filter(function (it) {
			return selectionIDs.indexOf(it) < 0;
		});
	}
	console.log(previousIDs);
	return previousIDs;
}





async function getPrefixNewID() {
	let newid = vscode.workspace.getConfiguration('html-headers-tools').prefixForNewIDs;

	// Ask to user the beginning string of new headers
	let options = vscode.InputBoxOptions = {
		ignoreFocusOut: true,
		prompt: "Define the beginning string of IDs?",
		value: newid
	};

	// Display message to ask the begining string to use for new headers
	await vscode.window.showInputBox(options).then(value => {
		if (value == undefined) {
			newid = undefined;
		} else {
			newid = value.toLowerCase();
		}
	});

	return newid;
}