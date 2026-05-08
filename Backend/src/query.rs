use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Universal query parameters for ALL list endpoints
#[derive(Debug, Deserialize, Default)]
pub struct QueryParams {
    /// JSON array of filter objects: [{"field":"status","op":"eq","value":"active"}]
    pub filters: Option<String>,
    /// Sort string: "field:asc,field2:desc"
    pub sort: Option<String>,
    /// Page number (1-based)
    pub page: Option<u32>,
    /// Items per page (default 25, max 100)
    pub per_page: Option<u32>,
    /// Comma-separated sparse fieldsets
    pub fields: Option<String>,
    /// Full-text search term
    pub search: Option<String>,
    /// Date range start
    pub from: Option<String>,
    /// Date range end
    pub to: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Filter {
    pub field: String,
    pub op: FilterOp,
    pub value: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FilterOp {
    Eq,
    Neq,
    Gt,
    Gte,
    Lt,
    Lte,
    #[serde(rename = "in")]
    In,
    #[serde(rename = "nin")]
    Nin,
    Like,
    Between,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortClause {
    pub field: String,
    pub direction: SortDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortDirection {
    Asc,
    Desc,
}

impl QueryParams {
    /// Parse filters JSON string into structured filters
    pub fn parse_filters(&self) -> Result<Vec<Filter>, String> {
        match &self.filters {
            Some(f) if !f.is_empty() => {
                serde_json::from_str(f).map_err(|e| format!("Invalid filters JSON: {}", e))
            }
            _ => Ok(vec![]),
        }
    }

    /// Parse sort string into sort clauses: "name:asc,created_at:desc"
    pub fn parse_sort(&self) -> Vec<SortClause> {
        match &self.sort {
            Some(s) if !s.is_empty() => s
                .split(',')
                .filter_map(|part| {
                    let mut parts = part.splitn(2, ':');
                    let field = parts.next()?.trim().to_string();
                    let dir = parts
                        .next()
                        .map(|d| match d.trim().to_lowercase().as_str() {
                            "desc" | "d" | "-1" => SortDirection::Desc,
                            _ => SortDirection::Asc,
                        })
                        .unwrap_or(SortDirection::Asc);
                    Some(SortClause {
                        field,
                        direction: dir,
                    })
                })
                .collect(),
            _ => vec![],
        }
    }

    /// Get page number (1-based, default 1)
    pub fn page_num(&self) -> u32 {
        self.page.unwrap_or(1).max(1)
    }

    /// Get per_page (default 25, max 100)
    pub fn per_page_val(&self) -> u32 {
        self.per_page.unwrap_or(25).min(100)
    }

    /// Calculate SQL OFFSET
    pub fn offset(&self) -> u32 {
        (self.page_num() - 1) * self.per_page_val()
    }

    /// Parse sparse fieldsets into list
    pub fn parse_fields(&self) -> Vec<String> {
        match &self.fields {
            Some(f) if !f.is_empty() => f.split(',').map(|s| s.trim().to_string()).collect(),
            _ => vec![],
        }
    }
}
