use sqlx::postgres::PgPool;
use std::env;
use dotenv::dotenv;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPool::connect(&database_url).await?;

    println!("--- ULTIMATE SCHEMA RESET INITIATED ---");

    let tables = vec!["classes", "subjects", "exams", "items", "spaces", "material_locations", "auth"];

    for table in tables {
        println!("Purging constraints for table: {}", table);
        
        // 1. Drop ALL unique and primary constraints
        let drop_query = format!(
            "DO $$ 
             DECLARE 
                cons_record RECORD;
             BEGIN 
                FOR cons_record IN (
                    SELECT conname 
                    FROM pg_constraint c 
                    JOIN pg_class t ON c.conrelid = t.oid 
                    JOIN pg_namespace n ON t.relnamespace = n.oid 
                    WHERE t.relname = '{}' AND n.nspname = 'public' AND c.contype IN ('p', 'u')
                ) LOOP
                    EXECUTE 'ALTER TABLE public.{} DROP CONSTRAINT ' || quote_ident(cons_record.conname) || ' CASCADE';
                END LOOP;
             END $$;",
            table, table
        );
        sqlx::query(&drop_query).execute(&pool).await?;
        println!("  - All constraints dropped.");

        // 2. Align types to TEXT for consistent indices
        if table != "exams" && table != "auth" {
            sqlx::query(&format!("ALTER TABLE public.{} ALTER COLUMN id TYPE TEXT", table)).execute(&pool).await.ok();
        }
        sqlx::query(&format!("ALTER TABLE public.{} ALTER COLUMN school_id TYPE TEXT", table)).execute(&pool).await.ok();
    }

    println!("--- RE-ESTABLISHING REPOSITORY-MATCHED CONSTRAINTS ---");

    // Classes & Subjects: (school_id, id)
    sqlx::query("ALTER TABLE public.classes ADD PRIMARY KEY (school_id, id)").execute(&pool).await?;
    sqlx::query("ALTER TABLE public.subjects ADD PRIMARY KEY (school_id, id)").execute(&pool).await?;

    // Exams: (school_id, name) - Ensure name is NOT NULL
    sqlx::query("UPDATE public.exams SET name = exam_name WHERE name IS NULL").execute(&pool).await?;
    sqlx::query("ALTER TABLE public.exams ALTER COLUMN name SET NOT NULL").execute(&pool).await?;
    sqlx::query("ALTER TABLE public.exams ADD CONSTRAINT exams_school_name_unique UNIQUE (school_id, name)").execute(&pool).await?;

    // Spaces: (school_id, space_id)
    sqlx::query("ALTER TABLE public.spaces ADD CONSTRAINT spaces_school_space_unique UNIQUE (school_id, space_id)").execute(&pool).await?;

    // Items: (school_id, space_id, item_id)
    sqlx::query("ALTER TABLE public.items ADD CONSTRAINT items_school_space_item_unique UNIQUE (school_id, space_id, item_id)").execute(&pool).await?;

    // Material Locations: (school_id, material_id, space_id, item_id)
    sqlx::query("ALTER TABLE public.material_locations ADD CONSTRAINT mat_loc_composite_unique UNIQUE (school_id, material_id, space_id, item_id)").execute(&pool).await?;

    // Auth: (school_id)
    sqlx::query("ALTER TABLE public.auth ADD CONSTRAINT auth_school_id_unique UNIQUE (school_id)").execute(&pool).await?;

    println!("--- SCHEMA RESET COMPLETE ---");
    Ok(())
}
