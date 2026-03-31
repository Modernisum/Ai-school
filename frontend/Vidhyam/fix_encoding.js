const fs = require('fs');
const path = require('path');

const files = [
    'home.jsx',
    'employee.jsx',
    'fees.jsx',
    'student.jsx'
];

files.forEach(file => {
    const filePath = path.join(__dirname, 'src', 'pages', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Strip BOM if present
        if (content.charCodeAt(0) === 0xFEFF || content.charCodeAt(0) === 0xFFFD) {
            content = content.slice(1);
        }
        // Convert out any other weird start chars just in case, but they might be read as weird because of UTF-16.
        // Actually, if it was written as UTF-16, reading it as utf8 might be mangled.
        // Let's read it as a buffer and check.
        let buf = fs.readFileSync(filePath);
        if (buf[0] === 0xFF && buf[1] === 0xFE) {
            content = buf.toString('utf16le');
        } else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
            content = buf.toString('utf8').substring(1);
        } else {
            content = buf.toString('utf8');
        }
        // Removing any leading garbage characters that might have snuck in (like replacement character)
        content = content.replace(/^[\uFEFF\uFFFD\u200B\u200C\u200D\u2060\u0000]+/, '');

        // Specifically fix 'import' if it exists.
        content = content.replace(/^.*import React/, 'import React');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed encoding for ${file}`);
    }
});
