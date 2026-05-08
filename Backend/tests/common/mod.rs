/// Shared test utilities and fixtures

#[cfg(test)]
pub mod factories;

/// Helper to build a filter JSON string
pub fn filter(field: &str, op: &str, value: &str) -> String {
    format!(r#"{{"field":"{}","op":"{}","value":"{}"}}"#, field, op, value)
}

/// Standard test school ID
pub const TEST_SCHOOL: &str = "TEST001";
