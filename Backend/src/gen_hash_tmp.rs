fn main() {
    let hash = bcrypt::hash("admin123", 10).unwrap();
    println!("{}", hash);
}
