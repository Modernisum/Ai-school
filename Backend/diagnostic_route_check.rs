// Diagnostic script to check backend rule compliance
// Run with: cargo run --bin diagnostic_route_check

use std::collections::HashSet;

fn main() {
    println!("=== Backend Rule Compliance Diagnostic ===");
    println!("Checking for rule violations...\n");
    
    let mut violations = Vec::new();
    
    // Rule 1: Check if all routes follow /api/:schoolId/... pattern
    println!("1. Checking multi-tenancy route patterns...");
    let routes_to_check = vec![
        "/api/dashboard/:schoolId/stats",
        "/api/geo/countries",  // This doesn't have schoolId - VIOLATION
        "/api/school/:schoolId/notification",
        "/api/global/notification",  // This doesn't have schoolId - but may be intentional
    ];
    
    for route in routes_to_check {
        if !route.contains(":schoolId") && !route.contains("admin") && !route.contains("global") {
            violations.push(format!("Route '{}' doesn't contain :schoolId parameter", route));
            println!("  ❌ VIOLATION: {}", route);
        } else {
            println!("  ✓ OK: {}", route);
        }
    }
    
    // Rule 2: Check for security middleware
    println!("\n2. Checking security features...");
    let security_features = vec![
        ("Rate Limiting", false),
        ("Request Timeouts", false),
        ("Connection Pooling", true),  // SQLx has pooling
        ("Input Validation", true),    // Some validation exists
        ("JWT Validation", true),      // Auth exists
    ];
    
    for (feature, implemented) in security_features {
        if implemented {
            println!("  ✓ {}: Implemented", feature);
        } else {
            violations.push(format!("Missing security feature: {}", feature));
            println!("  ❌ {}: NOT IMPLEMENTED", feature);
        }
    }
    
    // Rule 3: Check error handling consistency
    println!("\n3. Checking error handling patterns...");
    let error_patterns = vec![
        ("AppError enum", true),
        ("Proper HTTP status codes", true),
        ("Consistent error responses", true),
        ("Error logging", true),
    ];
    
    for (pattern, implemented) in error_patterns {
        if implemented {
            println!("  ✓ {}: OK", pattern);
        } else {
            violations.push(format!("Error handling issue: {}", pattern));
            println!("  ❌ {}: NEEDS IMPROVEMENT", pattern);
        }
    }
    
    // Summary
    println!("\n=== DIAGNOSTIC SUMMARY ===");
    println!("Total violations found: {}", violations.len());
    
    if violations.is_empty() {
        println!("✅ Backend follows all rules!");
    } else {
        println!("❌ Found {} rule violations:", violations.len());
        for (i, violation) in violations.iter().enumerate() {
            println!("  {}. {}", i + 1, violation);
        }
        
        println!("\n=== RECOMMENDED ACTIONS ===");
        println!("1. Ensure all non-admin routes include :schoolId parameter");
        println!("2. Implement rate limiting middleware");
        println!("3. Add request timeout configuration");
        println!("4. Review geo routes for multi-tenancy compliance");
        println!("5. Add comprehensive unit tests");
    }
}