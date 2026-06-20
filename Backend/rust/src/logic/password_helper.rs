//! Password hashing and verification helpers — powered by Argon2id.
//!
//! Argon2id (RFC 9106) is the winner of the Password Hashing Competition
//! and is recommended over bcrypt for all new systems because:
//!   - Memory-hard: resists GPU/ASIC brute-force attacks
//!   - Time-hard + memory-hard: much stronger than bcrypt at the same UX cost
//!   - PHC string format: self-describing hash includes algorithm, cost params & salt

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use crate::error::{AppError, AppResult};

// ── Argon2id parameters ───────────────────────────────────────────────────────
// OWASP 2023 recommendation: m=19456 (19 MiB), t=2, p=1
// These are embedded in the PHC string so future param changes are backward-compatible.

/// Hash a plaintext password using Argon2id.
///
/// Generates a random 22-byte salt per call and embeds it in the returned
/// PHC string (e.g. `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`).
///
/// # Errors
/// Returns [`AppError::Internal`] if Argon2 fails (effectively impossible with
/// valid params — included for type-safety).
pub fn hash_password(plain: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default(); // Argon2id, m=19456, t=2, p=1
    argon2
        .hash_password(plain.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {}", e)))
}

/// Verify a plaintext password against an Argon2id PHC hash string.
///
/// Returns `true` if the password matches, `false` if not.
///
/// # Errors
/// Returns [`AppError::Internal`] only on invalid hash format (not on wrong
/// password — that returns `Ok(false)`).
pub fn verify_password(plain: &str, hash: &str) -> AppResult<bool> {
    let parsed = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(format!("Invalid password hash format: {}", e)))?;

    Ok(Argon2::default()
        .verify_password(plain.as_bytes(), &parsed)
        .is_ok())
}
