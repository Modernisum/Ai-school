use bcrypt::{verify, hash, DEFAULT_COST};

fn main() {
    let hash_str = "$2b$10$hQjpOo0Xa2s7WD9vJp1Kf.gLuwVh2ouaNReFuZ3yDKvrZU.pT6OJ6";
    
    println!("Testing '123456': {}", verify("123456", hash_str).unwrap());
    println!("Testing 'admin@123': {}", verify("admin@123", hash_str).unwrap());
    
    let new_hash = hash("123456", DEFAULT_COST).unwrap();
    println!("New hash for '123456': {}", new_hash);
}
