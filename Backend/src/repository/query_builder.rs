//! Query builder utilities for constructing SQL queries dynamically
//! Fixed: removed manual $N placeholder generation — let sqlx QueryBuilder auto-generate them

use sqlx::{Postgres, QueryBuilder};
use serde_json::Value;
use std::collections::HashMap;

/// Builder for responsibility queries (uses sqlx QueryBuilder internally for auto placeholders)
pub struct ResponsibilityQueryBuilder {
    query: QueryBuilder<'static, Postgres>,
    has_where: bool,
}

impl ResponsibilityQueryBuilder {
    pub fn new() -> Self {
        Self {
            query: QueryBuilder::new("SELECT * FROM responsibilities"),
            has_where: false,
        }
    }

    pub fn school_id(mut self, school_id: &str) -> Self {
        self.query.push(" WHERE school_id = ");
        self.query.push_bind(school_id.to_string());
        self.has_where = true;
        self
    }

    pub fn employee_type(mut self, employee_type: Option<&str>) -> Self {
        if let Some(e_type) = employee_type {
            if self.has_where {
                self.query.push(" AND ");
            } else {
                self.query.push(" WHERE ");
                self.has_where = true;
            }
            self.query.push("employee_type = ");
            self.query.push_bind(e_type.to_string());
        }
        self
    }

    pub fn space_id(mut self, space_id: Option<&str>) -> Self {
        if let Some(s_id) = space_id {
            if self.has_where {
                self.query.push(" AND ");
            } else {
                self.query.push(" WHERE ");
                self.has_where = true;
            }
            self.query.push("space_id = ");
            self.query.push_bind(s_id.to_string());
        }
        self
    }

    pub fn search(mut self, search_term: Option<&str>) -> Self {
        if let Some(term) = search_term {
            if self.has_where {
                self.query.push(" AND ");
            } else {
                self.query.push(" WHERE ");
                self.has_where = true;
            }
            self.query.push("name ILIKE ");
            self.query.push_bind(format!("%{}%", term));
        }
        self
    }

    pub fn paginate(mut self, limit: Option<i64>, offset: Option<i64>) -> Self {
        if let Some(limit_val) = limit {
            self.query.push(" LIMIT ");
            self.query.push_bind(limit_val);
        }
        if let Some(offset_val) = offset {
            self.query.push(" OFFSET ");
            self.query.push_bind(offset_val);
        }
        self
    }

    pub fn order_by(mut self, field: &str, direction: &str) -> Self {
        self.query.push(format!(" ORDER BY {} {}", field, direction));
        self
    }

    /// Build — delegates to sqlx QueryBuilder::build() which returns a proper Query
    pub fn build(mut self) -> QueryBuilder<'static, Postgres> {
        self.query
    }
}

/// Builder for employee_responsibilities queries
pub struct EmployeeResponsibilityQueryBuilder {
    query: QueryBuilder<'static, Postgres>,
    has_where: bool,
}

impl EmployeeResponsibilityQueryBuilder {
    pub fn new() -> Self {
        Self {
            query: QueryBuilder::new("SELECT * FROM employee_responsibilities"),
            has_where: false,
        }
    }

    pub fn school_id(mut self, school_id: &str) -> Self {
        self.query.push(" WHERE school_id = ");
        self.query.push_bind(school_id.to_string());
        self.has_where = true;
        self
    }

    pub fn employee_id(mut self, employee_id: Option<&str>) -> Self {
        if let Some(e_id) = employee_id {
            if self.has_where {
                self.query.push(" AND ");
            } else {
                self.query.push(" WHERE ");
                self.has_where = true;
            }
            self.query.push("employee_id = ");
            self.query.push_bind(e_id.to_string());
        }
        self
    }

    pub fn responsibility_id(mut self, responsibility_id: Option<&str>) -> Self {
        if let Some(r_id) = responsibility_id {
            if self.has_where {
                self.query.push(" AND ");
            } else {
                self.query.push(" WHERE ");
                self.has_where = true;
            }
            self.query.push("responsibility_id = ");
            self.query.push_bind(r_id.to_string());
        }
        self
    }

    pub fn build(mut self) -> QueryBuilder<'static, Postgres> {
        self.query
    }
}

/// Builder for INSERT queries
pub struct InsertQueryBuilder {
    table: String,
    columns: Vec<String>,
    values: Vec<String>,
    params: Vec<Value>,
    on_conflict: Option<String>,
}

impl InsertQueryBuilder {
    pub fn new(table: &str) -> Self {
        Self { table: table.to_string(), columns: Vec::new(), values: Vec::new(), params: Vec::new(), on_conflict: None }
    }

    pub fn column(mut self, column: &str, value: Value) -> Self {
        self.columns.push(column.to_string());
        self.values.push(format!("${}", self.params.len() + 1));
        self.params.push(value);
        self
    }

    pub fn columns(mut self, data: &HashMap<String, Value>) -> Self {
        for (key, value) in data {
            self.columns.push(key.clone());
            self.values.push(format!("${}", self.params.len() + 1));
            self.params.push(value.clone());
        }
        self
    }

    pub fn on_conflict(mut self, conflict_columns: &[&str], update_columns: &[&str]) -> Self {
        let conflict_clause = conflict_columns.join(", ");
        let update_clause = update_columns.iter().map(|col| format!("{} = EXCLUDED.{}", col, col)).collect::<Vec<_>>().join(", ");
        self.on_conflict = Some(format!(" ON CONFLICT ({}) DO UPDATE SET {}", conflict_clause, update_clause));
        self
    }

    pub fn build(self) -> (String, Vec<Value>) {
        let columns_str = self.columns.join(", ");
        let values_str = self.values.join(", ");
        let mut sql = format!("INSERT INTO {} ({}) VALUES ({})", self.table, columns_str, values_str);
        if let Some(on_conflict) = self.on_conflict { sql.push_str(&on_conflict); }
        (sql, self.params)
    }
}

/// Builder for UPDATE queries
pub struct UpdateQueryBuilder {
    table: String,
    set_clauses: Vec<String>,
    where_clauses: Vec<String>,
    params: Vec<Value>,
}

impl UpdateQueryBuilder {
    pub fn new(table: &str) -> Self {
        Self { table: table.to_string(), set_clauses: Vec::new(), where_clauses: Vec::new(), params: Vec::new() }
    }

    pub fn set(mut self, column: &str, value: Value) -> Self {
        self.params.push(value);
        self.set_clauses.push(format!("{} = ${}", column, self.params.len()));
        self
    }

    pub fn r#where(mut self, condition: &str, value: Value) -> Self {
        self.params.push(value);
        self.where_clauses.push(format!("{} = ${}", condition, self.params.len()));
        self
    }

    pub fn build(self) -> (String, Vec<Value>) {
        let set_clause = self.set_clauses.join(", ");
        let where_clause = if !self.where_clauses.is_empty() { format!(" WHERE {}", self.where_clauses.join(" AND ")) } else { String::new() };
        let sql = format!("UPDATE {} SET {}{}", self.table, set_clause, where_clause);
        (sql, self.params)
    }
}

/// Helper: build a responsibility query with common filters
pub fn build_responsibility_query(
    school_id: &str,
    employee_type: Option<&str>,
    space_id: Option<&str>,
    search: Option<&str>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> QueryBuilder<'static, Postgres> {
    ResponsibilityQueryBuilder::new()
        .school_id(school_id)
        .employee_type(employee_type)
        .space_id(space_id)
        .search(search)
        .paginate(limit, offset)
        .order_by("created_at", "DESC")
        .build()
}

/// Helper: build an employee responsibility query
pub fn build_employee_responsibility_query(
    school_id: &str,
    employee_id: Option<&str>,
    responsibility_id: Option<&str>,
) -> QueryBuilder<'static, Postgres> {
    EmployeeResponsibilityQueryBuilder::new()
        .school_id(school_id)
        .employee_id(employee_id)
        .responsibility_id(responsibility_id)
        .build()
}