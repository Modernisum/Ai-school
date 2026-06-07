use sqlx::postgres::PgPool;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPool::connect(&database_url).await?;

    let tables = vec!["classes", "subjects", "exams", "items", "spaces"];

    for table in tables {
        println!("--- Schema for table: {} ---", table);
        let rows = sqlx::query(
            "SELECT table_schema, column_name, data_type, is_nullable 
             FROM information_schema.columns 
             WHERE table_name = $1"
        )
        .bind(table)
        .fetch_all(&pool)
        .await?;

        for row in rows {
            let schema: String = sqlx::Row::get(&row, "table_schema");
            let name: String = sqlx::Row::get(&row, "column_name");
            let dtype: String = sqlx::Row::get(&row, "data_type");
            let nullable: String = sqlx::Row::get(&row, "is_nullable");
            println!("{}.{}: {} (nullable: {})", schema, name, dtype, nullable);
        }

        // Check constraints
        let constraints = sqlx::query(
            "SELECT n.nspname as schema, conname as name, pg_get_constraintdef(c.oid) as definition
             FROM pg_constraint c
             JOIN pg_namespace n ON n.oid = c.connamespace
             JOIN pg_class cl ON cl.oid = c.conrelid
             WHERE cl.relname = $1"
        )
        .bind(table)
        .fetch_all(&pool)
        .await?;

        for con in constraints {
            let cname: String = sqlx::Row::get(&con, "name");
            let cdef: String = sqlx::Row::get(&con, "definition");
            println!("Constraint: {} -> {}", cname, cdef);
        }
    }

    println!("--- Testing Index Creations ---");
    let tests = vec![
        ("classes", "CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_school_id_unique ON classes (school_id, id)"),
        ("subjects", "CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_school_id_unique ON subjects (school_id, id)"),
        ("exams", "CREATE UNIQUE INDEX IF NOT EXISTS idx_exams_school_name_unique ON exams (school_id, name)"),
        ("items", "CREATE UNIQUE INDEX IF NOT EXISTS idx_items_space_item_unique ON items (space_id, item_id)"),
    ];

    for (name, sql) in tests {
        println!("Testing index for {}: {}", name, sql);
        match sqlx::query(sql).execute(&pool).await {
            Ok(_) => println!("OK"),
            Err(e) => println!("ERROR: {}", e),
        }
    }

    Ok(())
}
