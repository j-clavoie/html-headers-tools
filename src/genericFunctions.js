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
   */
  getTextSelected: function getTextSelected(selectWholeText = false) {
    const editor = this.getActiveEditor();
    let theRange = this.getRangeSelected(selectWholeText);

    return editor.document.getText(theRange);
  },



  /**
 * Method to know what's the language (French/English/etc) of the text of the code
 */
  getLang: async function getLang(extensionConfigurationName) {
    // Get Extension properties
    const extConfigs = vscode.workspace.getConfiguration(extensionConfigurationName)
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
    extConfigs.lang.forEach(function (elem) {
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
    extConfigs.lang.forEach(function (elem) {
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
  }
};