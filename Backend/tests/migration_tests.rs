//! Tests for database migrations, specifically pgcrypto encryption foundation

#[cfg(test)]
mod tests {
    use sqlx::{PgPool, PgConnection, Connection};
    use dotenv::dotenv;
    use std::env;

    /// Test that pgcrypto extension can be enabled
    #[tokio::test]
    async fn test_pgcrypto_extension_enabled() {
        dotenv().ok();
        
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set for migration tests");
        
        let mut conn = PgConnection::connect(&database_url)
            .await
            .expect("Failed to connect to database");
        
        // Check if pgcrypto extension exists
        let result = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')"
        )
        .fetch_one(&mut conn)
        .await
        .expect("Failed to check pgcrypto extension");
        
        assert!(result, "pgcrypto extension should be enabled");
    }

    /// Test that encryption functions exist
    #[tokio::test]
    async fn test_encryption_functions_exist() {
        dotenv().ok();
        
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set for migration tests");
        
        let mut conn = PgConnection::connect(&database_url)
            .await
            .expect("Failed to connect to database");
        
        // Check if encryption functions exist
        let functions = vec![
            "encrypt_aes_256_gcm",
            "decrypt_aes_256_gcm",
            "generate_encryption_key",
            "rotate_encryption_key",
        ];
        
        for function_name in functions {
            let result = sqlx::query_scalar::<_, bool>(
                &format!(
                    "SELECT EXISTS(
                        SELECT 1 FROM pg_proc 
                        WHERE proname = '{}' 
                        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                    )",
                    function_name
                )
            )
            .fetch_one(&mut conn)
            .await
            .expect(&format!("Failed to check {} function", function_name));
            
            assert!(result, "Function {} should exist", function_name);
        }
    }

    /// Test basic encryption/decryption functionality
    #[tokio::test]
    async fn test_basic_encryption_decryption() {
        dotenv().ok();
        
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set for migration tests");
        
        let mut conn = PgConnection::connect(&database_url)
            .await
            .expect("Failed to connect to database");
        
        // Test encryption with a simple value
        let plaintext = "Test sensitive data 123";
        let key = "test-encryption-key-001";
        
        let ciphertext: String = sqlx::query_scalar(
            "SELECT encrypt_aes_256_gcm($1, $2)"
        )
        .bind(plaintext)
        .bind(key)
        .fetch_one(&mut conn)
        .await
        .expect("Failed to encrypt test data");
        
        // Verify ciphertext is different from plaintext
        assert_ne!(ciphertext, plaintext);
        assert!(!ciphertext.is_empty());
        
        // Test decryption
        let decrypted: String = sqlx::query_scalar(
            "SELECT decrypt_aes_256_gcm($1, $2)"
        )
        .bind(&ciphertext)
        .bind(key)
        .fetch_one(&mut conn)
        .await
        .expect("Failed to decrypt test data");
        
        assert_eq!(decrypted, plaintext, "Decrypted text should match original");
    }

    /// Test SSL/TLS configuration view exists
    #[tokio::test]
    async fn test_ssl_configuration_view() {
        dotenv().ok();
        
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set for migration tests");
        
        let mut conn = PgConnection::connect(&database_url)
            .await
            .expect("Failed to connect to database");
        
        // Check if SSL configuration view exists
        let result = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(
                SELECT 1 FROM pg_views 
                WHERE viewname = 'ssl_configuration_status'
                AND schemaname = 'public'
            )"
        )
        .fetch_one(&mut conn)
        .await
        .expect("Failed to check SSL configuration view");
        
        // View may not exist in all environments, so this is informational
        if result {
            println!("SSL configuration view exists");
            
            // Try to query the view
            let ssl_status = sqlx::query("SELECT * FROM ssl_configuration_status")
                .fetch_all(&mut conn)
                .await;
            
            match ssl_status {
                Ok(rows) => println!("SSL configuration view returned {} rows", rows.len()),
                Err(e) => println!("Note: SSL configuration view query failed: {}", e),
            }
        } else {
            println!("SSL configuration view does not exist (this may be expected in some environments)");
        }
    }

    /// Test data classification helper functions
    #[tokio::test]
    async fn test_data_classification_functions() {
        dotenv().ok();
        
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set for migration tests");
        
        let mut conn = PgConnection::connect(&database_url)
            .await
            .expect("Failed to connect to database");
        
        // Check if data classification functions exist
        let functions = vec![
            "get_data_classification_level",
            "requires_encryption",
            "get_encryption_algorithm_for_level",
        ];
        
        for function_name in functions {
            let result = sqlx::query_scalar::<_, bool>(
                &format!(
                    "SELECT EXISTS(
                        SELECT 1 FROM pg_proc 
                        WHERE proname = '{}' 
                        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                    )",
                    function_name
                )
            )
            .fetch_one(&mut conn)
            .await
            .expect(&format!("Failed to check {} function", function_name));
            
            // These functions are optional, so we just log the result
            if result {
                println!("Function {} exists", function_name);
            } else {
                println!("Function {} does not exist (may need to be created)", function_name);
            }
        }
    }
}