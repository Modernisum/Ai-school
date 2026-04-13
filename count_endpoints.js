const fs = require('fs');
const path = require('path');

function countEndpointsInRouter(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Count route() calls
    const routeMatches = content.match(/\.route\(/g) || [];
    
    // Count HTTP methods
    const getMatches = content.match(/\.get\(/g) || [];
    const postMatches = content.match(/\.post\(/g) || [];
    const putMatches = content.match(/\.put\(/g) || [];
    const deleteMatches = content.match(/\.delete\(/g) || [];
    const patchMatches = content.match(/\.patch\(/g) || [];
    
    const totalMethods = getMatches.length + postMatches.length + putMatches.length + 
                         deleteMatches.length + patchMatches.length;
    
    console.log(`Route calls: ${routeMatches.length}`);
    console.log(`GET methods: ${getMatches.length}`);
    console.log(`POST methods: ${postMatches.length}`);
    console.log(`PUT methods: ${putMatches.length}`);
    console.log(`DELETE methods: ${deleteMatches.length}`);
    console.log(`PATCH methods: ${patchMatches.length}`);
    console.log(`Total HTTP methods: ${totalMethods}`);
    
    // Count routes with multiple methods on same line
    const multiMethodPattern = /\.route\([^)]+\)\s*\.(get|post|put|delete|patch)\([^)]+\)/gs;
    const multiMethodMatches = content.match(multiMethodPattern) || [];
    console.log(`Multi-method routes: ${multiMethodMatches.length}`);
    
    // Estimate total endpoints (adjust for double counting)
    const estimatedEndpoints = totalMethods - multiMethodMatches.length;
    console.log(`\nEstimated total endpoints: ${estimatedEndpoints}`);
    
    return estimatedEndpoints;
}

// Also check test-suite-progress.md for target
function getTargetFromProgress(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const targetMatch = content.match(/Target Endpoints:\s*(\d+)/);
        if (targetMatch) {
            return parseInt(targetMatch[1]);
        }
    } catch (err) {
        // ignore
    }
    return 320; // default
}

const routerPath = path.join(__dirname, 'Backend/src/routes/router.rs');
const progressPath = path.join(__dirname, 'api-tests/test-suite-progress.md');

console.log('=== Endpoint Analysis ===');
const estimatedTotal = countEndpointsInRouter(routerPath);
const targetEndpoints = getTargetFromProgress(progressPath);

console.log(`\nTarget endpoints (from progress file): ${targetEndpoints}`);
console.log(`Current test coverage: 298 endpoints`);
console.log(`Missing endpoints: ${targetEndpoints - 298}`);
console.log(`Estimated missing from router: ${estimatedTotal - 298}`);

// Identify specific missing endpoints by comparing with existing test files
console.log('\n=== Missing Endpoint Analysis ===');
console.log('Based on router analysis, we need to identify which specific endpoints are missing.');
console.log('Common areas that might be missing:');
console.log('1. Super Admin API - some nested routes');
console.log('2. Responsibility WebSocket routes');
console.log('3. Some nested routes in payment, chat, transport');
console.log('4. Some auth routes');
console.log('5. Some nested routes in leave system');