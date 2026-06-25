# Operations API Contract Index

Is index mein `rust/src/domain/operations/mod.rs` ke andar registered har endpoint ka route map hai. Har linked file mein request contracts, expected responses, error behavior, workflow rules, aur API test cases hain.

## Route groups

| Group | File | Routes covered | Main workflow |
|---|---|---|---|
| Responsibility CRUD | [01-responsibility-crud.md](./01-responsibility-crud.md) | `GET/POST /responsibility`, `GET/PATCH/DELETE /:responsibilityId`, `GET /export/csv`, `POST /import/csv` | Responsibility create, list, get, update, delete, CSV export/import |
| Responsibility Assignments | [02-responsibility-assignments.md](./02-responsibility-assignments.md) | Bulk assign/remove/update, employee/student/space lists, search | Staff assignment, bulk operations, student/space responsibility views |
| Responsibility Analytics | [03-responsibility-analytics.md](./03-responsibility-analytics.md) | Metrics endpoints, report generators, PDF exports | Utilization, workload, space-distribution, revenue metrics & reports |
| Responsibility Advanced | [04-responsibility-advanced.md](./04-responsibility-advanced.md) | Analytics, history, versions, rollback, sync fees, salaries, financial overview, alerts, WebSocket | Deep analytics, version rollback, fee sync, salary generation, real-time events |
| Transport | [05-transport.md](./05-transport.md) | GPS publish, bus location, driver students, mark pickup | Vehicle GPS tracking, passenger check-in |
| Tasks | [06-tasks.md](./06-tasks.md) | List tasks, update status, AI generate, AI reorganize | Task board management with AI |
| Complaints & Reminders | [07-complaints-reminders.md](./07-complaints-reminders.md) | Complaints CRUD, reminders list | Discipline complaints, operational reminders |

## Common response shape

Most success responses:

```json
{
  "success": true,
  "data": {}
}
```

Most error responses:

```json
{
  "success": false,
  "message": "<error message>"
}
```

## Route prefix

Sabhi routes `/api/school/:schoolId/operations/` ke andar nest hain. Responsibility routes `/responsibility/` sub-nest mein hain, transport routes `/transport/` sub-nest mein hain.

## Important notes

- `POST /api/school/:schoolId/operations/responsibility` creates a responsibility and publishes a WebSocket event via Redis.
- `POST /api/school/:schoolId/operations/responsibility/:responsibilityId/bulk-assign` sends email notifications to assigned employees.
- Transport GPS endpoints require `REDIS_URL` environment variable.
- Task AI endpoints require gRPC AI backend connection.
- Responsibility metrics reports accept optional `startDate`/`endDate` query params.
- Many handlers return `500 INTERNAL_SERVER_ERROR` for service/repository failures.
- WebSocket endpoint at `/responsibility/ws/` requires first-message authentication with token + school_id.