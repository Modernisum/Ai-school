use crate::repository::Repositories;
use anyhow::{anyhow, Result};
use chrono::{Datelike, NaiveDate};
use serde_json::{json, Value};
use sqlx::Row;
use std::sync::Arc;

pub struct SyllabusPlanner {
    pub repos: Arc<Repositories>,
}

impl SyllabusPlanner {
    pub fn new(repos: Arc<Repositories>) -> Self {
        Self { repos }
    }

    /// Plot annual syllabus for a class-subject: distribute chapters across 4 quarters
    /// based on weightage, respecting academic year (April 1 – March 31).
    pub async fn annual_syllabus_plot(
        &self,
        school_id: &str,
        class_id: &str,
        subject_id: &str,
        academic_year: i32, // e.g. 2026 = Apr 2026 – Mar 2027
    ) -> Result<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        // 1. Fetch all chapters for this subject
        let chapters = sqlx::query(
            "SELECT id, name, weightage, quarter FROM chapters WHERE school_id = $1 AND subject_id = $2 ORDER BY sequence_order"
        )
        .bind(school_id).bind(subject_id)
        .fetch_all(&mut *conn)
        .await?;

        if chapters.is_empty() {
            return Err(anyhow!("No chapters found for subject {}", subject_id));
        }

        // 2. Holiday lookup (all holidays in the academic year)
        let year_start = NaiveDate::from_ymd_opt(academic_year, 4, 1).unwrap();
        let year_end = NaiveDate::from_ymd_opt(academic_year + 1, 3, 31).unwrap();
        let holidays: Vec<NaiveDate> = sqlx::query_scalar(
            "SELECT date FROM holidays WHERE school_id = $1 AND date >= $2 AND date <= $3"
        )
        .bind(school_id).bind(year_start).bind(year_end)
        .fetch_all(&mut *conn)
        .await
        .unwrap_or_default();

        // 3. Quarter boundaries
        let quarters = vec![
            ("Q1", NaiveDate::from_ymd_opt(academic_year, 4, 1).unwrap(), NaiveDate::from_ymd_opt(academic_year, 6, 30).unwrap()),
            ("Q2", NaiveDate::from_ymd_opt(academic_year, 7, 1).unwrap(), NaiveDate::from_ymd_opt(academic_year, 9, 30).unwrap()),
            ("Q3", NaiveDate::from_ymd_opt(academic_year, 10, 1).unwrap(), NaiveDate::from_ymd_opt(academic_year, 12, 31).unwrap()),
            ("Q4", NaiveDate::from_ymd_opt(academic_year + 1, 1, 1).unwrap(), NaiveDate::from_ymd_opt(academic_year + 1, 3, 31).unwrap()),
        ];

        // 4. Compute available teaching days per quarter
        let mut quarter_days: Vec<(String, Vec<NaiveDate>)> = Vec::new();
        for (q_name, q_start, q_end) in &quarters {
            let mut days = Vec::new();
            let mut d = *q_start;
            while d <= *q_end {
                let dow = d.format("%u").to_string().parse::<u32>().unwrap_or(0);
                if dow != 7 && !holidays.contains(&d) {
                    days.push(d);
                }
                d += chrono::Duration::days(1);
            }
            quarter_days.push((q_name.to_string(), days));
        }

        // 5. Distribute chapters across quarters by weightage
        let total_weight: i32 = chapters.iter()
            .map(|r| r.get::<Option<i32>, &str>("weightage").unwrap_or(1))
            .sum();

        if total_weight == 0 {
            return Err(anyhow!("Total weightage is zero, cannot distribute"));
        }

        // Use the same optimal partition algorithm as get_auto_syllabus
        let n = chapters.len();
        let per_quarter_target = total_weight as f64 / 4.0;

        // Find optimal split points (i, j, k) for Q1, Q2, Q3, Q4
        let (p1, p2, p3) = if n < 4 {
            (0usize, 1usize.min(n.saturating_sub(1)), 2usize.min(n.saturating_sub(1)))
        } else {
            let mut best = (0usize, 1usize, 2usize);
            let mut min_err = f64::MAX;
            for i in 0..n {
                for j in (i + 1)..n {
                    for k in (j + 1)..n {
                        if k >= n - 1 { continue; }
                        let w1: i32 = chapters[0..=i].iter().map(|r| r.get::<Option<i32>, &str>("weightage").unwrap_or(1)).sum();
                        let w2: i32 = chapters[(i + 1)..=j].iter().map(|r| r.get::<Option<i32>, &str>("weightage").unwrap_or(1)).sum();
                        let w3: i32 = chapters[(j + 1)..=k].iter().map(|r| r.get::<Option<i32>, &str>("weightage").unwrap_or(1)).sum();
                        let w4: i32 = chapters[(k + 1)..].iter().map(|r| r.get::<Option<i32>, &str>("weightage").unwrap_or(1)).sum();
                        let err = (w1 as f64 - per_quarter_target).powi(2)
                            + (w2 as f64 - per_quarter_target).powi(2)
                            + (w3 as f64 - per_quarter_target).powi(2)
                            + (w4 as f64 - per_quarter_target).powi(2);
                        if err < min_err { min_err = err; best = (i, j, k); }
                    }
                }
            }
            best
        };

        // Assign chapters to quarters
        let quarter_chapter_ranges: Vec<(std::ops::RangeInclusive<usize>, &str)> = vec![
            (0..=p1, "Q1"),
            ((p1 + 1)..=p2, "Q2"),
            ((p2 + 1)..=p3, "Q3"),
            ((p3 + 1)..=(n.saturating_sub(1)), "Q4"),
        ];

        let mut inserted = Vec::new();

        for (range, quarter_name) in &quarter_chapter_ranges {
            let q_idx = match *quarter_name {
                "Q1" => 0usize, "Q2" => 1, "Q3" => 2, _ => 3,
            };
            let q_days = &quarter_days[q_idx].1;

            for (ch_idx_in_quarter, ch_idx) in range.clone().enumerate() {
                let row = &chapters[ch_idx];
                let chapter_id: i32 = row.get("id");
                let chapter_name: String = row.get("name");
                let ch_weight: i32 = row.get::<Option<i32>, &str>("weightage").unwrap_or(1);

                // Plan dates: distribute evenly within the quarter
                let range_size = range.clone().count().max(1);
                let day_start = (ch_idx_in_quarter * q_days.len().max(1)) / range_size;
                let day_end = ((ch_idx_in_quarter + 1) * q_days.len().max(1)) / range_size;
                let planned_start = q_days.get(day_start.min(q_days.len().max(1).saturating_sub(1))).copied();
                let planned_end = q_days.get(day_end.min(q_days.len().max(1).saturating_sub(1))).copied();

                let period_count = (ch_weight as f64 / total_weight as f64 * (q_days.len() as f64 * 6.0)).ceil() as i32;

                sqlx::query(
                    "INSERT INTO syllabus_calendar (school_id, class_id, subject_id, chapter_id, \
                     planned_start_date, planned_end_date, period_count, quarter, status) \
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') \
                     ON CONFLICT (school_id, class_id, subject_id, chapter_id, quarter) \
                     DO UPDATE SET planned_start_date = EXCLUDED.planned_start_date, \
                                   planned_end_date = EXCLUDED.planned_end_date, \
                                   period_count = EXCLUDED.period_count"
                )
                .bind(school_id).bind(class_id).bind(subject_id).bind(chapter_id)
                .bind(&planned_end.unwrap_or(q_days.first().copied().unwrap_or(year_start)))
                .bind(&planned_end.unwrap_or(q_days.last().copied().unwrap_or(year_end)))
                .bind(period_count)
                .bind(quarter_name)
                .execute(&mut *conn)
                .await?;

                inserted.push(json!({
                    "chapterId": chapter_id,
                    "chapterName": chapter_name,
                    "quarter": quarter_name,
                    "plannedStartDate": planned_start.map(|d| d.to_string()),
                    "plannedEndDate": planned_end.map(|d| d.to_string()),
                    "periodCount": period_count,
                }));
            }
        }

        Ok(json!({
            "success": true,
            "academicYear": format!("{}-{}", academic_year, academic_year + 1),
            "subjectId": subject_id,
            "totalChapters": chapters.len(),
            "syllabus": inserted,
        }))
    }

    /// Micro-plan period-level assignments for a date range.
    /// For each day with timetable slots for this class+subject, assign specific topics.
    pub async fn micro_plan_period_level(
        &self,
        school_id: &str,
        class_id: &str,
        subject_id: &str,
        from_date: &str,
        to_date: &str,
    ) -> Result<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;

        let from = NaiveDate::parse_from_str(from_date, "%Y-%m-%d")?;
        let to = NaiveDate::parse_from_str(to_date, "%Y-%m-%d")?;

        // 1. Fetch timetable slots for this class+subject in date range
        let slots = sqlx::query(
            "SELECT ts.day_of_week, ts.period_number, ts.teacher_id, tc.config_id \
             FROM timetable_slots ts \
             JOIN timetable_configs tc ON tc.config_id = ts.config_id AND tc.school_id = ts.school_id \
             WHERE ts.school_id = $1 AND ts.class_id = $2 AND ts.subject_id = $3 \
             AND tc.status = 'APPROVED'"
        )
        .bind(school_id).bind(class_id).bind(subject_id)
        .fetch_all(&mut *conn)
        .await?;

        if slots.is_empty() {
            return Err(anyhow!("No approved timetable slots found for class {} subject {}", class_id, subject_id));
        }

        // 2. Fetch syllabus_calendar for this class-subject (pending chapters)
        let pending_chapters = sqlx::query(
            "SELECT sc.id, sc.chapter_id, c.name as chapter_name, sc.quarter, sc.period_count \
             FROM syllabus_calendar sc \
             JOIN chapters c ON c.id = sc.chapter_id \
             WHERE sc.school_id = $1 AND sc.class_id = $2 AND sc.subject_id = $3 \
             AND sc.status = 'pending' ORDER BY sc.planned_start_date"
        )
        .bind(school_id).bind(class_id).bind(subject_id)
        .fetch_all(&mut *conn)
        .await?;

        if pending_chapters.is_empty() {
            return Err(anyhow!("No pending syllabus chapters for class {} subject {}", class_id, subject_id));
        }

        // 3. Build a map: day_of_week -> period_numbers for this subject
        let mut day_periods: std::collections::HashMap<i32, Vec<(i32, String, String)>> = std::collections::HashMap::new();
        for row in &slots {
            let dow: i32 = row.get("day_of_week");
            let period: i32 = row.get("period_number");
            let teacher_id: String = row.get("teacher_id");
            let config_id: String = row.get("config_id");
            day_periods.entry(dow).or_default().push((period, teacher_id, config_id));
        }

        // 4. Generate period plans
        let mut plans = Vec::new();
        let mut d = from;
        let mut chapter_idx = 0usize;

        while d <= to {
            let dow = d.format("%u").to_string().parse::<i32>().unwrap_or(0);
            if let Some(periods) = day_periods.get(&dow) {
                for (period_num, teacher_id, config_id) in periods {
                    let sc_row = &pending_chapters[chapter_idx.min(pending_chapters.len() - 1)];
                    let sc_id: i32 = sc_row.get("id");
                    let chapter_id: i32 = sc_row.get("chapter_id");
                    let chapter_name: String = sc_row.get("chapter_name");
                    let topic_name = format!("{} (Week {})", chapter_name, d.iso_week().week());

                    sqlx::query(
                        "INSERT INTO period_plans (school_id, class_id, subject_id, config_id, \
                         day_of_week, period_number, date, chapter_id, topic_name, teacher_id, status) \
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending') \
                         ON CONFLICT (school_id, config_id, day_of_week, period_number, date) \
                         DO UPDATE SET topic_name = EXCLUDED.topic_name, chapter_id = EXCLUDED.chapter_id"
                    )
                    .bind(school_id).bind(class_id).bind(subject_id).bind(config_id)
                    .bind(dow).bind(period_num).bind(d)
                    .bind(chapter_id).bind(&topic_name).bind(teacher_id)
                    .execute(&mut *conn)
                    .await?;

                    plans.push(json!({
                        "date": d.to_string(),
                        "periodNumber": period_num,
                        "chapterId": chapter_id,
                        "topicName": topic_name,
                        "teacherId": teacher_id,
                        "status": "pending",
                    }));

                    chapter_idx = (chapter_idx + 1) % pending_chapters.len();
                }
            }
            d += chrono::Duration::days(1);
        }

        // 5. Mark syllabus_calendar status as in_progress
        if !pending_chapters.is_empty() {
            let first_id: i32 = pending_chapters[0].get("id");
            sqlx::query("UPDATE syllabus_calendar SET status = 'in_progress' WHERE id = $1")
                .bind(first_id).execute(&mut *conn).await?;
        }

        Ok(json!({
            "success": true,
            "classId": class_id,
            "subjectId": subject_id,
            "fromDate": from_date,
            "toDate": to_date,
            "totalPlans": plans.len(),
            "plans": plans,
        }))
    }

    /// Restructure pending period plans when syllabus is behind schedule.
    /// Finds uncompleted plans before `date`, redistributes within the same quarter.
    pub async fn restructure_syllabus_on_delay(
        &self,
        school_id: &str,
        teacher_id: &str,
        date: &str,
    ) -> Result<Value> {
        let mut conn = self.repos.db_client.acquire_tenant_connection(school_id).await?;
        let cutoff = NaiveDate::parse_from_str(date, "%Y-%m-%d")?;

        // 1. Find pending/missed period_plans for this teacher before the cutoff
        let missed = sqlx::query(
            "SELECT pp.* FROM period_plans pp \
             WHERE pp.school_id = $1 AND pp.teacher_id = $2 AND pp.date < $3 \
             AND pp.status IN ('pending', 'missed') \
             ORDER BY pp.date, pp.period_number"
        )
        .bind(school_id).bind(teacher_id).bind(cutoff)
        .fetch_all(&mut *conn)
        .await?;

        if missed.is_empty() {
            return Ok(json!({"success": true, "restructured": 0, "message": "No pending plans found"}));
        }

        // 2. Find future available slots in the same quarter
        let future_slots = sqlx::query(
            "SELECT pp.* FROM period_plans pp \
             WHERE pp.school_id = $1 AND pp.teacher_id = $2 AND pp.date >= $3 \
             AND pp.status = 'pending' \
             ORDER BY pp.date, pp.period_number \
             LIMIT $4"
        )
        .bind(school_id).bind(teacher_id).bind(cutoff)
        .bind(missed.len() as i64)
        .fetch_all(&mut *conn)
        .await?;

        let redistribute_count = missed.len().min(future_slots.len());

        // 3. Redistribute: assign missed topics to future empty slots
        for i in 0..redistribute_count {
            let missed_row = &missed[i];
            let slot_row = &future_slots[i];

            let missed_chapter: Option<i32> = missed_row.get("chapter_id");
            let missed_topic: Option<String> = missed_row.get("topic_name");

            // Update the future slot with the missed topic
            sqlx::query(
                "UPDATE period_plans SET chapter_id = $1, topic_name = $2, status = 'pending' \
                 WHERE school_id = $3 AND id = $4"
            )
            .bind(missed_chapter).bind(&missed_topic)
            .bind(school_id)
            .bind(slot_row.get::<i32, &str>("id"))
            .execute(&mut *conn)
            .await?;

            // Mark the original missed plan as rescheduled
            sqlx::query(
                "UPDATE period_plans SET status = 'rescheduled' WHERE school_id = $1 AND id = $2"
            )
            .bind(school_id)
            .bind(missed_row.get::<i32, &str>("id"))
            .execute(&mut *conn)
            .await?;
        }

        // 4. If some missed topics couldn't be rescheduled → generate alert
        let remaining = missed.len() - redistribute_count;
        if remaining > 0 {
            sqlx::query(
                "INSERT INTO schedule_change_requests (school_id, type, requested_by, reason, status, date_from, date_to) \
                 VALUES ($1, 'skip', $2, $3, 'pending', $4, $5)"
            )
            .bind(school_id).bind(teacher_id)
            .bind(format!("{} topics could not be rescheduled within the quarter — needs admin review", remaining))
            .bind(cutoff).bind(cutoff + chrono::Duration::days(7))
            .execute(&mut *conn)
            .await?;
        }

        Ok(json!({
            "success": true,
            "restructured": redistribute_count,
            "remaining": remaining,
            "message": format!("Rescheduled {} topics. {} still pending admin review.", redistribute_count, remaining),
        }))
    }
}
