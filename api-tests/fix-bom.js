const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'categories', '25-spaces.bru');
let content = fs.readFileSync(filePath, 'utf8');
// Remove UTF-8 BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}
// Also remove any other non-printable characters at start
content = content.replace(/^\uFEFF/, '');
fs.writeFileSync(filePath, content, 'utf8');
console.log('BOM removed');