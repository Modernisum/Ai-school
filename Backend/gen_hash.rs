fn main() {
    let password = "admin@123";
    let hash = bcrypt::hash(password, 10).unwrap();
    println!("Password: {}", password);
    println!("Hash: {}", hash);
    let verify = bcrypt::verify(password, &hash).unwrap();
    println!("Verified: {}", verify);
}
