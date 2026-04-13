const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'categories', '25-spaces.bru');
let content = fs.readFileSync(filePath, 'utf8');

// Try to parse and re-serialize
try {
    const obj = JSON.parse(content);
    // Ensure it has the correct structure
    if (!obj.items && obj.requests) {
        // Convert requests to items
        obj.items = obj.requests.map(req => ({
            name: req.name,
            type: 'http-request',
            request: {
                url: req.url,
                method: req.method,
                headers: req.headers,
                body: req.body,
                query: req.params
            }
        }));
        delete obj.requests;
        obj.type = 'collection';
    }
    const newContent = JSON.stringify(obj, null, 2);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('File repaired successfully');
} catch (e) {
    console.error('Error parsing JSON:', e.message);
    // Try to fix common issues
    // Remove trailing commas
    content = content.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    // Try again
    try {
        const obj = JSON.parse(content);
        const newContent = JSON.stringify(obj, null, 2);
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('File repaired after cleaning');
    } catch (e2) {
        console.error('Still invalid:', e2.message);
        process.exit(1);
    }
}