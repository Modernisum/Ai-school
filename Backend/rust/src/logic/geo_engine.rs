//! Geolocation and coordinate calculation helpers.
//!
//! This module provides offline-friendly, framework-agnostic functions for
//! working with GPS coordinates. None of these functions depend on Axum or
//! any HTTP framework.

use std::f64::consts::PI;

/// Calculate the great-circle distance between two GPS coordinates using
/// the Haversine formula. Returns the result in **metres**.
///
/// # Arguments
/// * `lat1`, `lon1` — latitude/longitude of the first point (decimal degrees)
/// * `lat2`, `lon2` — latitude/longitude of the second point (decimal degrees)
pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6_371_000.0_f64; // Earth radius in metres
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);
    r * 2.0 * a.sqrt().atan2((1.0 - a).sqrt())
}

/// Returns `true` if the two coordinates are within `max_distance_metres` of
/// each other.
pub fn is_within_range(lat1: f64, lon1: f64, lat2: f64, lon2: f64, max_distance_metres: f64) -> bool {
    haversine_distance(lat1, lon1, lat2, lon2) <= max_distance_metres
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_point_is_zero_distance() {
        let d = haversine_distance(28.6139, 77.2090, 28.6139, 77.2090);
        assert!(d < 1.0, "Same point should be ~0 m, got {}", d);
    }

    #[test]
    fn known_distance_is_reasonable() {
        // Delhi (28.6139, 77.2090) → Mumbai (19.0760, 72.8777) ≈ 1155 km
        let d = haversine_distance(28.6139, 77.2090, 19.0760, 72.8777);
        assert!(d > 1_100_000.0 && d < 1_250_000.0, "Expected ~1155 km, got {:.0} m", d);
    }

    #[test]
    fn within_range_works() {
        // 100 m threshold; same point should pass
        assert!(is_within_range(28.6139, 77.2090, 28.6139, 77.2090, 100.0));
        // ~1155 km should fail a 500 m threshold
        assert!(!is_within_range(28.6139, 77.2090, 19.0760, 72.8777, 500.0));
    }
}
