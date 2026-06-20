use deadpool_redis::Pool;
use redis::AsyncCommands;

/// Three-tier caching strategy
pub struct CacheLayer {
    pool: Pool,
}

impl CacheLayer {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    /// Cache key builder: "cache:{school_id}:{entity}:{key}"
    fn key(school_id: &str, entity: &str, key: &str) -> String {
        format!("cache:{}:{}:{}", school_id, entity, key)
    }

    /// L1: Response cache (5 min TTL) — full JSON responses
    pub async fn cache_response(&self, school_id: &str, entity: &str, hash: &str, value: &str) -> Result<(), String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let key = Self::key(school_id, entity, &format!("resp:{}", hash));
        let _: () = conn.set_ex(&key, value,300u64).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn get_cached_response(&self, school_id: &str, entity: &str, hash: &str) -> Result<Option<String>, String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let key = Self::key(school_id, entity, &format!("resp:{}", hash));
        conn.get(&key).await.map_err(|e| e.to_string())
    }

    /// L2: Query result cache (10 min TTL) — DB row sets
    pub async fn cache_query(&self, school_id: &str, entity: &str, hash: &str, value: &str) -> Result<(), String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let key = Self::key(school_id, entity, &format!("qry:{}", hash));
        let _: () = conn.set_ex(&key, value,600).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn get_cached_query(&self, school_id: &str, entity: &str, hash: &str) -> Result<Option<String>, String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let key = Self::key(school_id, entity, &format!("qry:{}", hash));
        conn.get(&key).await.map_err(|e| e.to_string())
    }

    /// L3: Count/aggregate cache (30 min TTL) — expensive COUNT queries
    pub async fn cache_count(&self, school_id: &str, entity: &str, hash: &str, value: i64) -> Result<(), String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let key = Self::key(school_id, entity, &format!("cnt:{}", hash));
        let _: () = conn.set_ex(&key, value,1800).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn get_cached_count(&self, school_id: &str, entity: &str, hash: &str) -> Result<Option<i64>, String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let key = Self::key(school_id, entity, &format!("cnt:{}", hash));
        conn.get(&key).await.map_err(|e| e.to_string())
    }

    /// Invalidate all caches for a school+entity on write
    pub async fn invalidate(&self, school_id: &str, entity: &str) -> Result<(), String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let pattern = format!("cache:{}:{}:*", school_id, entity);
        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(&pattern)
            .query_async(&mut conn)
            .await
            .map_err(|e| e.to_string())?;
        if !keys.is_empty() {
            let _: () = conn.del(&keys).await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    /// Rate limiter: check and increment
    pub async fn check_rate_limit(&self, key: &str, max: u32, window_secs: u32) -> Result<bool, String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let count: u32 = conn
            .incr(key, 1)
            .await
            .map_err(|e| e.to_string())?;
        if count == 1 {
            let _: () = conn
                .expire(key, window_secs as i64)
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(count <= max)
    }

    /// Simple set with TTL
    pub async fn set_with_ttl(&self, key: &str, value: &str, ttl_secs: u64) -> Result<(), String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        let _: () = conn.set_ex(key, value, ttl_secs).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Simple get
    pub async fn get(&self, key: &str) -> Result<Option<String>, String> {
        let mut conn = self.pool.get().await.map_err(|e| e.to_string())?;
        conn.get(key).await.map_err(|e| e.to_string())
    }
}
