# Backend Team Access & RBAC Design Document

## Context & Objectives
Issue: [AudioBitsStellar/AudioBlocks_For_Artist#525](https://github.com/AudioBitsStellar/AudioBlocks_For_Artist/issues/525)  
Backend Tracking Issue: [AudioBitsStellar/AudioBlock_Backend#784](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/784)

Previously, artist team and staff access (#460) was maintained client-side in browser `localStorage`. Permissions were evaluated strictly in the frontend via `RoleContext` and `canManageTeam(role)`. This allowed arbitrary client-side bypasses and prevented invited staff from authentically logging in across devices.

This document specifies the backend multi-tenant workspace model and RBAC authorization engine, establishing server-side enforcement as the authoritative source of truth.

---

## 1. Relational Data Model

### Workspace Member Entity (`workspace_members`)
Represents the mapping between an artist's workspace and invited staff:

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Primary key |
| `workspace_id` | UUID (FK -> users.id) | The artist account owning the workspace |
| `user_id` | UUID (FK -> users.id) | The invited member account (nullable while invite is pending) |
| `role` | VARCHAR(16) | `owner` \| `manager` \| `viewer` |
| `status` | VARCHAR(16) | `invited` \| `active` \| `revoked` |
| `invited_by` | UUID (FK -> users.id) | User who created the invite |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Workspace Invite Entity (`workspace_invites`)

| Field | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Primary key |
| `workspace_id` | UUID (FK) | Workspace the invite grants access to |
| `email` | VARCHAR(255) | Recipient email address (normalized lower-case) |
| `role` | VARCHAR(16) | `manager` \| `viewer` |
| `token_hash` | VARCHAR(64) | SHA-256 hash of single-use acceptance token |
| `status` | VARCHAR(16) | `pending` \| `accepted` \| `revoked` \| `expired` |
| `expires_at` | TIMESTAMP | Expiration timestamp (default: 7 days) |
| `created_at` | TIMESTAMP | Timestamp when invitation was sent |

---

## 2. API Endpoints & Access Control

| Endpoint | Method | Allowed Roles | Description |
|---|---|---|---|
| `/api/artist/team` | `GET` | `owner`, `manager`, `viewer` | List active team members and pending invites |
| `/api/artist/team/invite` | `POST` | `owner` | Send invite by email with role assignment |
| `/api/artist/team/:id` | `PATCH` | `owner` | Change staff member's role (`manager` <-> `viewer`) |
| `/api/artist/team/:id` | `DELETE` | `owner` | Remove member from workspace / revoke pending invite |
| `/api/artist/team/accept-invite` | `POST` | Authenticated user | Accept an invitation token and join workspace |

---

## 3. Server-Side RBAC Permissions Matrix

Backend middlewares enforce granular permissions per endpoint:

| Resource / Action | Owner | Manager | Viewer |
|---|:---:|:---:|:---:|
| **View Analytics & Catalog** | Yes | Yes | Yes |
| **Upload / Edit Songs** | Yes | Yes | No (403 Forbidden) |
| **Moderate / Reply Comments** | Yes | Yes | No (403 Forbidden) |
| **Manage Merch Inventory** | Yes | Yes | No (403 Forbidden) |
| **Edit Workspace Profile & Settings** | Yes | No (403) | No (403 Forbidden) |
| **Payouts & Wallet Updates** | Yes | No (403) | No (403 Forbidden) |
| **Contract Upgrades** | Yes | No (403) | No (403 Forbidden) |
| **Manage Team Access** | Yes | No (403) | No (403 Forbidden) |

When an unauthorized role attempts a privileged API call, the backend immediately responds with `403 Forbidden` and logs a security audit event:
```json
{
  "error": "Forbidden",
  "code": "INSUFFICIENT_PERMISSIONS",
  "message": "You do not have permission to perform this action in this workspace."
}
```

---

## 4. Session & Frontend Integration
1. **Session JWT Claims**: Upon login or workspace selection, the session JWT carries:
   - `sub`: Authenticated user ID
   - `workspaceId`: Target workspace ID
   - `workspaceRole`: Verified role (`owner` | `manager` | `viewer`)
2. **RoleContext**: Initialized directly from the session profile/token. Client-side role checks are retained solely for UI/UX (e.g., hiding edit buttons or showing "Read-only" tags).
3. **Backend as Source of Truth**: Any 403 API response triggers a standard user-friendly notification ("You don't have permission to perform this action").
4. **Rollout Flag**: The `/dashboard/team` page is guarded behind `teamManagement` until the backend service is fully deployed.
