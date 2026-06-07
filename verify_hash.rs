use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

fn main() {
    // Sample Argon2id hash for testing (password is '123456')
    let hash_str = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$VnS1YwT8x8+P2Y9UfX1yD9fFpT6+F9z6X1d2e3f4g5h"; 
    
    if let Ok(parsed) = PasswordHash::new(hash_str) {
        println!("Testing '123456': {}", Argon2::default().verify_password("123456".as_bytes(), &parsed).is_ok());
        println!("Testing 'admin@123': {}", Argon2::default().verify_password("admin@123".as_bytes(), &parsed).is_ok());
    } else {
        println!("Invalid hash format");
    }
    
    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password("123456".as_bytes(), &salt)
        .unwrap()
        .to_string();
    println!("New hash for '123456': {}", new_hash);
}
