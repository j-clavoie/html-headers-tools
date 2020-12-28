# HTML Headers Tools Extension for Visual Studio Code
This is a Visual Studio Code extension for HTML file, it contains tools related to headers (h2-h6).

## Overview
Concept related to this extension is based on that page can only have one H1 header and all other headers must respect hierarchical structure (ie: H2, followed by H3, etc. never pass from H2 to H4).

List of actual tools:
+ Validates hierarchical structure of headers (h2-h6). If a header level is passed over, an error is added to the VSCode 'Problems' tab.

+ Set/Reset ID in headers. IDs are used as anchor for table of contents of link that points directly to the right place. This function help to define ID in headers with a hierarchical structure. The format of id will look like: h_1, h_1_1, h_1_2, h_2, etc.

+ Create a nested list (UL) with links that point to each headers. It's used to create a table of contents.

## How to use
### **Validation**
The validation can be made from a selection or the whole editor's content.
If text is selected, the extension will validate the hierarchical structure in the selection only.

### **Set/Reset IDs**
The set/reset can be made from a selection or the whole editor's content.
The extension will:
+ checks if headers are already have ID defined. If yes, the user will have to select if ID must be kept or replaced.
+ asks to know the prefix of new IDs created. The default prefix may be changes in the Extension's properties.
+ adds/replaces ID in headers if the ID not already exists in the whole content of the code. No matter if text is selected or not. ID must be unique in the code.

### **Create list for Table of contents**
The create ToC list is inserted where the cursur is present, so it's important to place the cursor at the right place before to execute the script.
The list will include ALL headers that have ID set. So, if in the code, some headers with ID not have to be present in the list, they must be removed manually.

## Configuration instructions
```JSON
to be defined
```

## Known bugs
See the Changelog.md to get more information.