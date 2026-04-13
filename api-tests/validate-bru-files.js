const fs = require('fs');
const path = require('path');

// Validate Bruno collection file structure
function validateBrunoFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Required fields
        const requiredFields = ['version', 'name', 'type', 'items'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            return {
                valid: false,
                errors: [`Missing required fields: ${missingFields.join(', ')}`]
            };
        }
        
        // Validate items array
        if (!Array.isArray(data.items)) {
            return {
                valid: false,
                errors: ['Items must be an array']
            };
        }
        
        const itemErrors = [];
        
        data.items.forEach((item, index) => {
            // Check required item fields
            if (!item.name || !item.type || !item.request) {
                itemErrors.push(`Item ${index + 1}: Missing name, type, or request`);
                return;
            }
            
            // Check request structure
            if (!item.request.url || !item.request.method) {
                itemErrors.push(`Item ${index + 1}: Missing url or method in request`);
            }
            
            // Check headers if present
            if (item.request.headers && !Array.isArray(item.request.headers)) {
                itemErrors.push(`Item ${index + 1}: Headers must be an array`);
            }
            
            // Check body if present
            if (item.request.body) {
                // For raw JSON body
                if (item.request.body.mode === 'raw' && !item.request.body.raw) {
                    itemErrors.push(`Item ${index + 1}: Raw body must have raw field`);
                }
                // For formdata body
                else if (item.request.body.mode === 'formdata' && !item.request.body.formdata) {
                    itemErrors.push(`Item ${index + 1}: Formdata body must have formdata field`);
                }
                // For legacy format (type instead of mode)
                else if (item.request.body.type && !item.request.body.raw) {
                    itemErrors.push(`Item ${index + 1}: Body must have raw field when type is present`);
                }
                // Body present but no valid structure
                else if (!item.request.body.mode && !item.request.body.type) {
                    itemErrors.push(`Item ${index + 1}: Body must have mode or type field`);
                }
            }
        });
        
        if (itemErrors.length > 0) {
            return {
                valid: false,
                errors: itemErrors
            };
        }
        
        return {
            valid: true,
            endpointCount: data.items.length,
            name: data.name
        };
        
    } catch (error) {
        return {
            valid: false,
            errors: [`JSON parsing error: ${error.message}`]
        };
    }
}

// Main validation function
function validateAllBrunoFiles() {
    const categoriesDir = path.join(__dirname, 'categories');
    const files = fs.readdirSync(categoriesDir).filter(file => file.endsWith('.bru'));
    
    console.log('Validating Bruno collection files...\n');
    
    let totalValid = 0;
    let totalInvalid = 0;
    let totalEndpoints = 0;
    
    files.forEach(file => {
        const filePath = path.join(categoriesDir, file);
        const result = validateBrunoFile(filePath);
        
        if (result.valid) {
            console.log(`✅ ${file}: VALID (${result.endpointCount} endpoints) - ${result.name}`);
            totalValid++;
            totalEndpoints += result.endpointCount;
        } else {
            console.log(`❌ ${file}: INVALID`);
            result.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
            totalInvalid++;
        }
        console.log();
    });
    
    // Validate environment file
    const envFilePath = path.join(__dirname, 'environment.bru');
    if (fs.existsSync(envFilePath)) {
        try {
            const envContent = fs.readFileSync(envFilePath, 'utf8');
            const envData = JSON.parse(envContent);
            console.log(`✅ environment.bru: VALID (${Object.keys(envData.variables || {}).length} variables)`);
        } catch (error) {
            console.log(`❌ environment.bru: INVALID - ${error.message}`);
        }
    }
    
    console.log('\n=== Validation Summary ===');
    console.log(`Total files: ${files.length}`);
    console.log(`Valid: ${totalValid}`);
    console.log(`Invalid: ${totalInvalid}`);
    console.log(`Total endpoints: ${totalEndpoints}`);
    
    return totalInvalid === 0;
}

// Run validation
if (require.main === module) {
    try {
        const allValid = validateAllBrunoFiles();
        process.exit(allValid ? 0 : 1);
    } catch (error) {
        console.error('Validation error:', error.message);
        process.exit(1);
    }
}

module.exports = { validateBrunoFile, validateAllBrunoFiles };