use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new().connect(&db_url).await?;
    
    // Get school_id from argument or fetch the most recent one
    let mut args = env::args().skip(1);
    let school_id = match args.next() {
        Some(arg) => arg,
        None => {
            let row: (String,) = sqlx::query_as("SELECT school_id FROM schools ORDER BY created_at DESC LIMIT 1")
                .fetch_one(&pool)
                .await?;
            row.0
        }
    };
    println!("Checking school_id: {}", school_id);

    let db_name = format!("school_{}", school_id.replace('-', "_"));
    
    let exists: (bool,) = sqlx::query_as("SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)")
        .bind(&db_name)
        .fetch_one(&pool)
        .await?;
    println!("Schema {} exists: {}", db_name, exists.0);
    
    if exists.0 {
        let tables: Vec<(String,)> = sqlx::query_as("SELECT table_name FROM information_schema.tables WHERE table_schema = $1")
            .bind(&db_name)
            .fetch_all(&pool)
            .await?;
        println!("Tables in {}: {:?}", db_name, tables.iter().map(|t| &t.0).collect::<Vec<_>>());
        
        let classes: Vec<(String, String)> = sqlx::query_as(&format!("SELECT id, name FROM {}.classes", db_name))
            .fetch_all(&pool)
            .await?;
        println!("Classes in {}: {:?}", db_name, classes);

        let subjects: Vec<(String, String)> = sqlx::query_as(&format!("SELECT id, name FROM {}.subjects", db_name))
            .fetch_all(&pool)
            .await?;
        println!("Subjects in {}: {:?}", db_name, subjects);

        let spaces: Vec<(String, String)> = sqlx::query_as(&format!("SELECT space_id, space_name FROM {}.spaces", db_name))
            .fetch_all(&pool)
            .await?;
        println!("Spaces in {}: {:?}", db_name, spaces);

        let items: Vec<(String, String)> = sqlx::query_as(&format!("SELECT item_id, item_name FROM {}.items", db_name))
            .fetch_all(&pool)
            .await?;
        println!("Items in {}: {:?}", db_name, items);
    }
    
    Ok(())
}
