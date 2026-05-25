fn main() {
    let hash_str = "$2b$10$hQjpOo0Xa2s7WD9vJp1Kf.gLuwVh2ouaNReFuZ3yDKvrZU.pT6OJ6";
    
    println!("Testing '123456': {}", bcrypt::verify("123456", hash_str).unwrap());
    println!("Testing 'admin@123': {}", bcrypt::verify("admin@123", hash_str).unwrap());
    
    let new_hash = bcrypt::hash("123456", 10).unwrap();
    println!("New hash for '123456': {}", new_hash);
}
