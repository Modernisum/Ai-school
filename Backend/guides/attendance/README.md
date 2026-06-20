# Attendance & Leaves Guides

Yeh folder `rust/src/domain/attendance/mod.rs` ke fresher-friendly backend documentation ke liye hai.

## Files

- `attendance_guide.md`: High-level domain overview, architecture, feature purpose, developer laws, aur API snippets.
- `implementation_plan.md`: Attendance/leave API docs ko split `.md` files mein implement karne ka plan.
- `api/00-index.md`: Attendance/leave route groups aur expected `.md` file locations.

## Base routing

Attendance routes are mounted under:

```text
/api/school/:schoolId/attendance
```

Leave routes are mounted under:

```text
/api/school/:schoolId/attendance/leave
```

## Public API route

```text
/api/school/:schoolId/attendance/public/attendance/:date
```

This route is protected by API key auth and requires the `read:attendance` scope.

## Documentation rule

Every endpoint from `rust/src/domain/attendance/mod.rs` should eventually have:

- Expected request shape
- Expected success response
- Expected error response
- Workflow/business rule
- Test case id and curl-style request

Use `implementation_plan.md` as the implementation checklist.
