from datetime import datetime, date, timedelta
from typing import Dict, List, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

class SyllabusPlanner:
    @staticmethod
    def get_weekday_iso(d: date) -> int:
        # ISO weekday: Monday is 1, Sunday is 7
        return d.isoweekday()

    @staticmethod
    async def annual_syllabus_plot(
        session: AsyncSession,
        school_id: str,
        class_id: str,
        subject_id: str,
        academic_year: int
    ) -> Dict[str, Any]:
        """Plots annual syllabus and distributes chapters across Q1-Q4 based on weightage, ignoring holidays."""
        # 1. Fetch chapters
        result = await session.execute(
            text(
                "SELECT id, name, COALESCE(weightage, 1) as weightage FROM chapters "
                "WHERE school_id = :sid AND subject_id = :sub_id "
                "ORDER BY sequence_order"
            ),
            {"sid": school_id, "sub_id": subject_id}
        )
        chapters = [dict(row._mapping) for row in result.all()]
        if not chapters:
            raise ValueError(f"No chapters found for subject {subject_id}")

        # 2. Fetch holidays in academic year (April 1 to March 31)
        year_start = date(academic_year, 4, 1)
        year_end = date(academic_year + 1, 3, 31)
        
        holiday_result = await session.execute(
            text(
                "SELECT date FROM holidays WHERE school_id = :sid AND date >= :start AND date <= :end"
            ),
            {"sid": school_id, "start": year_start, "end": year_end}
        )
        holidays = {row[0] for row in holiday_result.all()}

        # 3. Define Quarters boundaries
        quarters = [
            ("Q1", date(academic_year, 4, 1), date(academic_year, 6, 30)),
            ("Q2", date(academic_year, 7, 1), date(academic_year, 9, 30)),
            ("Q3", date(academic_year, 10, 1), date(academic_year, 12, 31)),
            ("Q4", date(academic_year + 1, 1, 1), date(academic_year + 1, 3, 31))
        ]

        # 4. Teaching days per quarter (excluding Sundays and holidays)
        quarter_days = {}
        for q_name, q_start, q_end in quarters:
            days = []
            curr = q_start
            while curr <= q_end:
                if curr.isoweekday() != 7 and curr not in holidays:
                    days.append(curr)
                curr += timedelta(days=1)
            quarter_days[q_name] = days

        # 5. Distribute chapters optimally across quarters based on weightage
        total_weight = sum(ch["weightage"] for ch in chapters)
        if total_weight == 0:
            raise ValueError("Total weightage is zero, cannot distribute")

        n = len(chapters)
        target = total_weight / 4.0

        if n < 4:
            p1 = 0
            p2 = min(1, n - 1)
            p3 = min(2, n - 1)
        else:
            best = (0, 1, 2)
            min_err = float("inf")
            for i in range(n):
                for j in range(i + 1, n):
                    for k in range(j + 1, n):
                        if k >= n - 1:
                            continue
                        w1 = sum(ch["weightage"] for ch in chapters[0:i+1])
                        w2 = sum(ch["weightage"] for ch in chapters[i+1:j+1])
                        w3 = sum(ch["weightage"] for ch in chapters[j+1:k+1])
                        w4 = sum(ch["weightage"] for ch in chapters[k+1:])
                        
                        err = (w1 - target)**2 + (w2 - target)**2 + (w3 - target)**2 + (w4 - target)**2
                        if err < min_err:
                            min_err = err
                            best = (i, j, k)
            p1, p2, p3 = best

        # Quarter mappings
        quarter_ranges = [
            (range(0, p1 + 1), "Q1"),
            (range(p1 + 1, p2 + 1), "Q2"),
            (range(p2 + 1, p3 + 1), "Q3"),
            (range(p3 + 1, n), "Q4")
        ]

        inserted = []
        for ch_range, q_name in quarter_ranges:
            q_days = quarter_days[q_name]
            range_size = len(ch_range)
            
            for ch_idx_in_q, ch_idx in enumerate(ch_range):
                ch = chapters[ch_idx]
                chapter_id = ch["id"]
                chapter_name = ch["name"]
                ch_weight = ch["weightage"]
                
                day_start_idx = (ch_idx_in_q * len(q_days)) // max(range_size, 1)
                day_end_idx = ((ch_idx_in_q + 1) * len(q_days)) // max(range_size, 1)
                
                # Fetch start and end date boundaries
                start_d = q_days[min(day_start_idx, len(q_days) - 1)] if q_days else year_start
                end_d = q_days[min(day_end_idx, len(q_days) - 1)] if q_days else year_end
                
                # Period count logic
                period_count = int(round((ch_weight / total_weight) * (len(q_days) * 6.0)))
                
                await session.execute(
                    text(
                        "INSERT INTO syllabus_calendar (school_id, class_id, subject_id, chapter_id, "
                        "planned_start_date, planned_end_date, period_count, quarter, status) "
                        "VALUES (:sid, :cid, :sub, :chid, :pstart, :pend, :pcount, :q, 'pending') "
                        "ON CONFLICT (school_id, class_id, subject_id, chapter_id, quarter) "
                        "DO UPDATE SET planned_start_date = EXCLUDED.planned_start_date, "
                        "planned_end_date = EXCLUDED.planned_end_date, "
                        "period_count = EXCLUDED.period_count"
                    ),
                    {
                        "sid": school_id,
                        "cid": class_id,
                        "sub": subject_id,
                        "chid": chapter_id,
                        "pstart": start_d,
                        "pend": end_d,
                        "pcount": period_count,
                        "q": q_name
                    }
                )
                
                inserted.append({
                    "chapterId": chapter_id,
                    "chapterName": chapter_name,
                    "quarter": q_name,
                    "plannedStartDate": str(start_d),
                    "plannedEndDate": str(end_d),
                    "periodCount": period_count
                })
        
        await session.commit()
        return {
            "success": True,
            "academicYear": f"{academic_year}-{academic_year + 1}",
            "subjectId": subject_id,
            "totalChapters": n,
            "syllabus": inserted
        }

    @staticmethod
    async def micro_plan_period_level(
        session: AsyncSession,
        school_id: str,
        class_id: str,
        subject_id: str,
        from_date_str: str,
        to_date_str: str
    ) -> Dict[str, Any]:
        """Maps class timetable slots to pending chapters to plan day-by-day topics."""
        from_date = datetime.strptime(from_date_str, "%Y-%m-%d").date()
        to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()

        # 1. Fetch timetable slots
        slots_result = await session.execute(
            text(
                "SELECT ts.day_of_week, ts.period_number, ts.teacher_id, tc.config_id "
                "FROM timetable_slots ts "
                "JOIN timetable_configs tc ON tc.config_id = ts.config_id AND tc.school_id = ts.school_id "
                "WHERE ts.school_id = :sid AND ts.class_id = :cid AND ts.subject_id = :sub "
                "AND tc.status = 'APPROVED'"
            ),
            {"sid": school_id, "cid": class_id, "sub": subject_id}
        )
        slots = slots_result.all()
        if not slots:
            raise ValueError(f"No approved timetable slots found for class {class_id} subject {subject_id}")

        # 2. Fetch pending syllabus chapters
        chapters_result = await session.execute(
            text(
                "SELECT sc.id, sc.chapter_id, c.name as chapter_name, sc.quarter, sc.period_count "
                "FROM syllabus_calendar sc "
                "JOIN chapters c ON c.id = sc.chapter_id "
                "WHERE sc.school_id = :sid AND sc.class_id = :cid AND sc.subject_id = :sub "
                "AND sc.status = 'pending' ORDER BY sc.planned_start_date"
            ),
            {"sid": school_id, "cid": class_id, "sub": subject_id}
        )
        pending_chapters = chapters_result.all()
        if not pending_chapters:
            raise ValueError(f"No pending syllabus chapters for class {class_id} subject {subject_id}")

        # 3. Map day_of_week -> slots
        day_periods = {}
        for row in slots:
            dow, period_num, teacher_id, config_id = row
            day_periods.setdefault(dow, []).append((period_num, teacher_id, config_id))

        # 4. Generate period plans
        plans = []
        curr = from_date
        chapter_idx = 0
        
        while curr <= to_date:
            dow = curr.isoweekday()
            if dow in day_periods:
                for period_num, teacher_id, config_id in day_periods[dow]:
                    sc_row = pending_chapters[chapter_idx % len(pending_chapters)]
                    sc_id, chapter_id, chapter_name, quarter, period_count = sc_row
                    
                    # Compute topic name
                    year, week_num, _ = curr.isocalendar()
                    topic_name = f"{chapter_name} (Week {week_num})"

                    await session.execute(
                        text(
                            "INSERT INTO period_plans (school_id, class_id, subject_id, config_id, "
                            "day_of_week, period_number, date, chapter_id, topic_name, teacher_id, status) "
                            "VALUES (:sid, :cid, :sub, :conf, :dow, :pnum, :date, :chid, :topic, :teacher, 'pending') "
                            "ON CONFLICT (school_id, config_id, day_of_week, period_number, date) "
                            "DO UPDATE SET topic_name = EXCLUDED.topic_name, chapter_id = EXCLUDED.chapter_id"
                        ),
                        {
                            "sid": school_id, "cid": class_id, "sub": subject_id, "conf": config_id,
                            "dow": dow, "pnum": period_num, "date": curr,
                            "chid": chapter_id, "topic": topic_name, "teacher": teacher_id
                        }
                    )
                    
                    plans.append({
                        "date": str(curr),
                        "periodNumber": period_num,
                        "chapterId": chapter_id,
                        "topicName": topic_name,
                        "teacherId": teacher_id,
                        "status": "pending"
                    })
                    
                    chapter_idx += 1
            curr += timedelta(days=1)

        # 5. Mark first pending calendar chapter as in_progress
        if pending_chapters:
            first_sc_id = pending_chapters[0][0]
            await session.execute(
                text("UPDATE syllabus_calendar SET status = 'in_progress' WHERE id = :id"),
                {"id": first_sc_id}
            )

        await session.commit()
        return {
            "success": True,
            "classId": class_id,
            "subjectId": subject_id,
            "fromDate": from_date_str,
            "toDate": to_date_str,
            "totalPlans": len(plans),
            "plans": plans
        }

    @staticmethod
    async def restructure_syllabus_on_delay(
        session: AsyncSession,
        school_id: str,
        teacher_id: str,
        date_str: str
    ) -> Dict[str, Any]:
        """Reschedules missed lessons forward into future empty slots, alerts admin on overflow."""
        cutoff_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        # 1. Fetch pending missed period plans
        missed_result = await session.execute(
            text(
                "SELECT id, chapter_id, topic_name FROM period_plans "
                "WHERE school_id = :sid AND teacher_id = :tid AND date < :cutoff "
                "AND status IN ('pending', 'missed') "
                "ORDER BY date, period_number"
            ),
            {"sid": school_id, "tid": teacher_id, "cutoff": cutoff_date}
        )
        missed = missed_result.all()
        if not missed:
            return {"success": True, "restructured": 0, "message": "No pending plans found"}

        # 2. Fetch future empty slots (limit to the number of missed items)
        future_result = await session.execute(
            text(
                "SELECT id FROM period_plans "
                "WHERE school_id = :sid AND teacher_id = :tid AND date >= :cutoff "
                "AND status = 'pending' "
                "ORDER BY date, period_number "
                "LIMIT :lim"
            ),
            {"sid": school_id, "tid": teacher_id, "cutoff": cutoff_date, "lim": len(missed)}
        )
        future_slots = future_result.all()
        redistribute_count = min(len(missed), len(future_slots))

        # 3. Update future plans with missed chapters/topics
        for i in range(redistribute_count):
            m_row = missed[i]
            f_row = future_slots[i]
            
            # Update future slot
            await session.execute(
                text(
                    "UPDATE period_plans SET chapter_id = :chid, topic_name = :topic, status = 'pending' "
                    "WHERE school_id = :sid AND id = :fid"
                ),
                {
                    "chid": m_row[1],
                    "topic": m_row[2],
                    "sid": school_id,
                    "fid": f_row[0]
                }
            )

            # Mark old missed slot as rescheduled
            await session.execute(
                text("UPDATE period_plans SET status = 'rescheduled' WHERE school_id = :sid AND id = :mid"),
                {"sid": school_id, "mid": m_row[0]}
            )

        # 4. Handle overflow and alerts
        remaining = len(missed) - redistribute_count
        if remaining > 0:
            await session.execute(
                text(
                    "INSERT INTO schedule_change_requests (school_id, type, requested_by, reason, status, date_from, date_to) "
                    "VALUES (:sid, 'skip', :tid, :reason, 'pending', :from_d, :to_d)"
                ),
                {
                    "sid": school_id,
                    "tid": teacher_id,
                    "reason": f"{remaining} topics could not be rescheduled within the quarter — needs admin review",
                    "from_d": cutoff_date,
                    "to_d": cutoff_date + timedelta(days=7)
                }
            )

        await session.commit()
        return {
            "success": True,
            "restructured": redistribute_count,
            "remaining": remaining,
            "message": f"Rescheduled {redistribute_count} topics. {remaining} still pending admin review."
        }
