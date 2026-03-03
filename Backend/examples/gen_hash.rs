fn main() {
    let hash = bcrypt::hash("school123", 10).unwrap();
    println!("{}", hash);
}
