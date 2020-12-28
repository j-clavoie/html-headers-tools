"use strict";
const vscode = require('vscode');

module.exports = {

  /**
   * Method to update the range of the Active Editor content
   * @param {string} htmlCode Contains the string to add/replace in the editor
   * @param {Range} placeToUpdate Contains the range in the editor to insert/replace
   */
  updateEditor: function updateEditor(htmlCode, placeToUpdate) {
    // Get the ActiveEditor
    const editor = vscode.window.activeTextEditor;

    // Update the content in the range defined before.
    editor.edit((text) => {
      text.replace(placeToUpdate, htmlCode);
    });
  },


  /**
   * Method to get the current active editor
   * If no editor is opened then return false
   * else return the active editor
   */
  getActiveEditor: function getActiveEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No editor available.');
      return false;
    } else {
      return editor;
    }
  },


  /**
   * Method to get the range of text selected
   * @param {boolean} selectWholeText If no text selected then the whole text is selected
   */
  getRangeSelected: function getRangeSelected(selectWholeText = false) {
    const editor = this.getActiveEditor();
    let theRange = null;
    // If no text selected and parameters "selectWholeText" is TRUE then select the whole text
    if (editor.selection.isEmpty && selectWholeText) {
      // Get the whole content
      theRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
    } else {
      // Define the selected text as range
      theRange = new vscode.Range(editor.selection.start, editor.selection.end);
    }
    return theRange;
  },



  /**
   * Method to get text selected in editor
   * @param {boolean} selectWholeText If no text selected then the whole text is selected
   * Return the text selected or whole text
   */
  getTextSelected: function getTextSelected(selectWholeText = false) {
    const editor = this.getActiveEditor();
    let theRange = this.getRangeSelected(selectWholeText);

    return editor.document.getText(theRange);
  },



  /**
   * Method that asks to user the language (english, french, etc) of the text (content) in the code
   * The list could be stored in the Extension's properties but by default "editor.textLanguages" is used.
   * In the default situation, the user's settings must have the "editor.textLanguages" parameters set properly.
   */
  getLang: async function getLang(extensionConfigurationName = "editor") {
    // Get Extension properties
    const textLanguages = vscode.workspace.getConfiguration(extensionConfigurationName).textLanguages;
    if (textLanguages == null || textLanguages == undefined) {
      vscode.window.showErrorMessage("The '" + extensionConfigurationName + ".textLanguages' is not set properly.");
      return null;
    }

    // Create a empty array that will contain all Workspace Names
    let listLang = [];

    // Option for the dropdown popup
    let options = vscode.QuickPickOptions = {
      placeHolder: "Select the language of the text in the code:",
      canPickMany: false,
      ignoreFocusOut: true,
      matchOnDescription: true,
      matchOnDetail: true
    };

    // Pass through all Workspace set in Extension properties
    textLanguages.forEach(function (elem) {
      // Add only the name to the array
      listLang.push(elem.langName);
    });

    // Display the dropdown popup to user
    const langName = await vscode.window.showQuickPick(listLang, options);
    // If Escape key has been used = exit without any other process
    if (langName == undefined) {
      return null;
    }

    // Define de default return for this function (null)
    let landCode = null;
    // Pass through all Workspace set in Extension properties
    textLanguages.forEach(function (elem) {
      // If the user's selection match set the path to return
      if (langName == elem.langName) {
        landCode = elem.langCode;
      }
    });

    // Return the path or NULL if the escape key has been used
    return landCode;
  },



  /**
   * Methode to check the file type to validate if it's HTML
   * Return TRUE if file type is HTML
   * 				FLASE if it's not HTML
   */
  isHTMLcode: function isHTMLcode() {
    const document_lang = vscode.window.activeTextEditor.document.languageId;
    if (document_lang != "html") {
      vscode.window.showErrorMessage("The file must be HTML, this script works only for HTML file.");
      return false;
    } else {
      return true;
    }
  },

  /**
   * Method to get the position of the Selection in the Active Text Editor.
   * Return: the start position of the selection
   *         If no selection, then create a start position to 0,0 (beginning of the text editor)
   */
  getPositionSelection: function getPositionSelection() {
    const myEditor = this.getActiveEditor();
    let startSelectionRange;

    if (myEditor.selection.isEmpty) {
      startSelectionRange = new vscode.Position(0, 0);
    } else {
      startSelectionRange = myEditor.selection.start;
    }

    return startSelectionRange;
  },


  /** ***********************************************************************************************
   * @param {JSDOM} DOM 
   * @param {JSDOM.nodeElem} DOMelem Element of DOM to get the range position in Editor
   * @param {boolean} fromSelection Indicates if the Selection starting point must be added or not.
   */
  getDOMelementPosition: function getDOMelementPosition(DOM, DOMelem, fromSelection = true) {
    let startSelectionPosition;

    // Get the node location
    const nodeElem = DOM.nodeLocation(DOMelem);

    // if the selection position must be considered than rerieve Selection's start position
    // If not then the position won't be incremented
    if (fromSelection){
      startSelectionPosition = this.getPositionSelection();
    } else {
      new vscode.Position(0, 0);
    }
    
    // Set the range of text the header in error
    const elemRange = new vscode.Range(
      nodeElem.startTag.startLine - 1 + startSelectionPosition.line,
      nodeElem.startTag.startCol - 1,
      nodeElem.startTag.endLine - 1 + startSelectionPosition.line,
      nodeElem.startTag.endCol - 1
    );

    return elemRange;
  }
};