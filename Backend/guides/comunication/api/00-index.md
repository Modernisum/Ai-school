# Communication API Contract Index

Yeh index `rust/src/domain/communication/mod.rs` mein registered har endpoint ka route map hai. Har linked file mein request contracts, expected responses, error behavior, workflow rules, aur API test cases hain.

## Route groups

| Group | File | Routes covered | Main workflow |
|---|---|---|---|
| Announcements | [01-announcements.md](./01-announcements.md) | `POST /announcements/:type/:userId` | Admin/Teacher announcements with role-based validation |
| Chat | [02-chat.md](./02-chat.md) | `POST /chat/:schoolId/send`, `GET /chat/:schoolId/history/:user1/:user2`, `GET /chat/:schoolId/ai-history` | Peer-to-peer chat messaging, Redis Pub/Sub broadcast, chat history |
| Notifications | [03-notifications.md](./03-notifications.md) | `GET/POST /notifications`, unread-count, mark-read, mark-all-read, delete, school notification | Notification center CRUD, unread tracking, school-level alerts |
| WebSocket | [04-websocket.md](./04-websocket.md) | `GET /ws` | Real-time WebSocket upgrade, token auth, Redis Pub/Sub subscription |
| Webhooks | [05-webhooks.md](./05-webhooks.md) | `POST/GET /webhooks`, `DELETE /webhooks/:webhookId`, `GET /webhooks/:webhookId/logs` | Register, list, delete webhooks; delivery logs |
| Legacy Notifications | [06-legacy-notifications.md](./06-legacy-notifications.md) | `GET/DELETE /school/:schoolId/notification`, `GET /global/notification` | Backward-compatible legacy notification routes |

## Common response shape

Most success responses use:

```json
{
  "success": true,
  "data": {}
}
```

Most error responses use:

```json
{
  "success": false,
  "message": "<error message>"
}
```

## Important documentation notes

- **Chat endpoints** (`send_message`, `get_history`) return raw `ChatMessage` structs with `200 OK` directly — they do NOT wrap in `{ success: true, data: ... }`.
- **Notifications** use `AppResult` which wraps errors but returns `Json<Value>` directly for success.
- **School notification** endpoints (`/school/notification`, `/school/notify/global`) delegate to `admin::make_admin_service` and use `ok_json!` / `err_json!` macros.
- **WebSocket handler** authenticates via a JSON `WsAuthPayload` message sent as the first text frame after upgrade, not via query string or header.
- **Announcements** require `role` field in body. If `TEACHER`, `classId` and `subjectId` are mandatory; teacher must be mapped to the responsibility.
- Many handlers return `500 INTERNAL_SERVER_ERROR` for service/repository failures. Product-level APIs may later change these to `400`, `403`, or `404`.