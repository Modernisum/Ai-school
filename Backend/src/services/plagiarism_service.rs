use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::sync::Arc;

use crate::repository::Repositories;
use crate::services::traits::plagiarism::{PlagiarismServiceTrait, PlagiarismCheck, MatchedSection, PlagiarismCache};

pub struct PlagiarismService {
    repos: Arc<Repositories>,
}

impl PlagiarismService {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    fn calculate_similarity(&self, text1: &str, text2: &str) -> f32 {
        // Simple similarity calculation using Jaccard similarity of word sets
        let words1: std::collections::HashSet<&str> = text1.split_whitespace().collect();
        let words2: std::collections::HashSet<&str> = text2.split_whitespace().collect();
        
        let intersection: std::collections::HashSet<&str> = words1.intersection(&words2).cloned().collect();
        let union: std::collections::HashSet<&str> = words1.union(&words2).cloned().collect();
        
        if union.is_empty() {
            return 0.0;
        }
        
        intersection.len() as f32 / union.len() as f32
    }
    
    fn generate_hash(&self, text: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(text);
        let result = hasher.finalize();
        format!("{:x}", result)
    }
    
    fn compare_texts(&self, text1: &str, text2: &str) -> (f32, Vec<MatchedSection>) {
        let similarity = self.calculate_similarity(text1, text2);
        
        let matched_sections = if similarity > 0.3 {
            // Simple section matching - split by sentences
            let sentences1: Vec<&str> = text1.split('.').collect();
            let sentences2: Vec<&str> = text2.split('.').collect();
            
            let mut matches = Vec::new();
            
            for (i, sent1) in sentences1.iter().enumerate() {
                for (j, sent2) in sentences2.iter().enumerate() {
                    let sent_similarity = self.calculate_similarity(sent1, sent2);
                    if sent_similarity > 0.7 {
                        matches.push(MatchedSection {
                            text: sent1.to_string(),
                            similarity: sent_similarity,
                            source_submission_id: j as i32, // Using index as placeholder
                        });
                    }
                }
            }
            
            matches
        } else {
            Vec::new()
        };
        
        (similarity, matched_sections)
    }
}

#[async_trait]
impl PlagiarismServiceTrait for PlagiarismService {
    async fn check_plagiarism(&self, submission_id: i32, text: &str, threshold: f32) -> crate::error::AppResult<PlagiarismCheck> {
        // Mock implementation - in production, this would query the database
        // for other submissions in the same assignment
        
        let hash = self.generate_hash(text);
        
        // Simulate comparing with 3 other submissions
        let mock_texts = [
            "This is a sample answer to the question about photosynthesis.",
            "Photosynthesis is the process by which plants convert light energy into chemical energy.",
            "The answer discusses the importance of chlorophyll in capturing sunlight.",
        ];
        
        let mut similarity_scores = Vec::new();
        let mut matched_sections = Vec::new();
        
        for (i, mock_text) in mock_texts.iter().enumerate() {
            let (similarity, sections) = self.compare_texts(text, mock_text);
            similarity_scores.push(similarity);
            
            for mut section in sections {
                section.source_submission_id = (i + 100) as i32; // Mock submission IDs
                matched_sections.push(section);
            }
        }
        
        let highest_similarity = similarity_scores.iter().cloned().fold(0.0, f32::max);
        let is_plagiarized = highest_similarity > threshold;
        
        Ok(PlagiarismCheck {
            submission_id,
            compared_submission_ids: vec![101, 102, 103], // Mock IDs
            similarity_scores,
            highest_similarity,
            is_plagiarized,
            plagiarism_threshold: threshold,
            matched_sections,
        })
    }
    
    async fn cache_plagiarism_hash(&self, submission_id: i32, text: &str) -> crate::error::AppResult<String> {
        let hash = self.generate_hash(text);
        
        // In production, this would insert into the plagiarism_cache table
        // For now, just return the hash
        Ok(hash)
    }
    
    async fn get_cached_hashes(&self, assignment_id: i32) -> crate::error::AppResult<Vec<PlagiarismCache>> {
        // Mock implementation
        let caches = vec![
            PlagiarismCache {
                hash: "abc123".to_string(),
                submission_id: 101,
                created_at: chrono::Utc::now(),
            },
            PlagiarismCache {
                hash: "def456".to_string(),
                submission_id: 102,
                created_at: chrono::Utc::now(),
            },
        ];
        
        Ok(caches)
    }
    
    async fn batch_check_plagiarism(&self, submission_ids: Vec<i32>) -> crate::error::AppResult<Vec<PlagiarismCheck>> {
        // Mock implementation
        let mut results = Vec::new();
        
        for (idx, &submission_id) in submission_ids.iter().enumerate() {
            results.push(PlagiarismCheck {
                submission_id,
                compared_submission_ids: vec![101, 102, 103],
                similarity_scores: vec![0.1, 0.2, 0.3],
                highest_similarity: 0.3,
                is_plagiarized: false,
                plagiarism_threshold: 0.7,
                matched_sections: Vec::new(),
            });
        }
        
        Ok(results)
    }
}