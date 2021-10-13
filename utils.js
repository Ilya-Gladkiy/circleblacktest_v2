'use strict';

/**
 * Alters xml input.
 * 1. Moves id to be an attribute instead of an element of box
 * 2. Removes records, adds items as an attribute of box. items is set equal to a comma separate list of the value of each record
 * 3. Does not modify anything about link
 * @param {String} xml The xml to reformat
 * @return {String} The reformatted xml
 */
exports.formatXml = function formatXml(xml) {
  return xml.replace(
    /(<box>\n<title>(.+)<\/title>\n<id>)(.+)(<\/id>\n<link>(.+)<\/link>\n<records>\n\s+<record>)(.+)(<\/record>\n\s+<record>)(.+)(<\/record>\n<\/records>\n<\/box>)/ig,
    '<box id="$3" items="$6,$8">\n<title>$2</title>\n<link>$5</link>\n</box>'
  );
};

/**
 * Formats the input to use the first 9 digits to create a phone number.
 * @param {String|Number} input The string or number to format
 * @return {String} The formatted phone number as "(###) ###-####"
 */
exports.formatPhone = function formatPhone(input) {
  return String(input)
    .replace(/[^\d]/g, '')
    .replace(/^(\d{3})(\d{3})(\d{4})\d*$/, '($1) $2-$3');
};
