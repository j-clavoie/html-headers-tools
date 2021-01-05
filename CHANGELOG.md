# Change Log

## known bugs/weird behaviors
+ Set/Reset function: When keeping already existing IDs, the function won't use the kept parent's ID for its childs. Example: a kept parent ID named "h_3" will have childs with something like "h_5_3" or "h_4_3_3". The function won't check if an existing ID has childs. It's a bit weird but the concept of unique ID is respected.

## [0.0.9] - 2020-01-04
+ Issue with the list creation for the table of contents. Parts of previous code were stay.<br />Fixed now.

## [0.0.8] - 2020-12-30
Fix the name of the Extension's property

## [0.0.7] - 2020-12-28
Working script (3 - Validate headers, set/reset IDs, create Table of contents html List).