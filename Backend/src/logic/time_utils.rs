//! Time and date parsing utilities.
//!
//! Framework-agnostic helpers for converting flexible time strings into
//! RFC-3339 / ISO-8601 format. Lives in `logic/` so both `repository/`
//! and `services/` can import it without creating circular dependencies.

/// Convert a loose HH:MM or HH:MM:SS time string combined with a YYYY-MM-DD
/// date string into an RFC-3339 timestamp string.
///
/// Accepts:
/// - Already-valid RFC-3339 strings (returned as-is)
/// - `"HH:MM"` or `"HH:MM:SS"` combined with `date_str = "YYYY-MM-DD"`
///
/// Returns `None` if parsing fails or the input is empty.
pub fn parse_to_rfc3339(time_str: &str, date_str: &str) -> Option<String> {
    let t_trimmed = time_str.trim();
    if t_trimmed.is_empty() {
        return None;
    }
    // Already a valid RFC-3339 — return as-is
    if chrono::DateTime::parse_from_rfc3339(t_trimmed).is_ok() {
        return Some(t_trimmed.to_string());
    }
    // Parse HH:MM[:SS]
    let parts: Vec<&str> = t_trimmed.split(':').collect();
    if parts.len() >= 2 {
        let hr = parts[0].parse::<u32>().ok()?;
        let min = parts[1].parse::<u32>().ok()?;
        let sec = if parts.len() > 2 {
            parts[2].parse::<u32>().ok().unwrap_or(0)
        } else {
            0
        };
        if hr < 24 && min < 60 && sec < 60 {
            let date_parts: Vec<&str> = date_str.split('-').collect();
            if date_parts.len() == 3 {
                let yr = date_parts[0].parse::<i32>().ok()?;
                let mo = date_parts[1].parse::<u32>().ok()?;
                let dy = date_parts[2].parse::<u32>().ok()?;
                if mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31 {
                    return Some(format!(
                        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
                        yr, mo, dy, hr, min, sec
                    ));
                }
            }
        }
    }
    None
}
