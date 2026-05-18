use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new().connect(&db_url).await?;

    let school_id = "689225";

    // 1. Check classes
    let classes: Vec<(String, String)> = sqlx::query_as(
        "SELECT id, name FROM public.classes WHERE school_id = $1"
    )
    .bind(school_id)
    .fetch_all(&pool)
    .await?;

    println!("=== CLASSES FOR {} ===", school_id);
    for c in &classes {
        println!(" - ID: {}, Name: {}", c.0, c.1);
    }

    // 2. Check subjects
    let subjects: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT subject_id, name, class_id FROM public.subjects WHERE school_id = $1"
    )
    .bind(school_id)
    .fetch_all(&pool)
    .await?;

    println!("\n=== SUBJECTS FOR {} ===", school_id);
    for s in &subjects {
        println!(" - ID: {}, Name: {}, Class ID: {}", s.0, s.1, s.2);
    }

    // 3. Check exams
    let exams: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT id, name, class_id FROM public.exams WHERE school_id = $1"
    )
    .bind(school_id)
    .fetch_all(&pool)
    .await?;

    println!("\n=== EXAMS FOR {} ===", school_id);
    for e in &exams {
        println!(" - ID: {}, Name: {}, Class ID: {}", e.0, e.1, e.2);
    }

    Ok(())
}
