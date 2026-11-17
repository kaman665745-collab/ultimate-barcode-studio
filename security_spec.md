# Security Specification — Ultimate Barcode Studio

## 1. Data Invariants
1. **Strict Owner Isolation**: Every user document (`/users/{userId}/private/profile`, `/users/{userId}/projects/{projectId}`, `/users/{userId}/history/{entryId}`) can only be read, listed, created, updated, or deleted when `request.auth != null`, `request.auth.uid == userId`, and `request.auth.token.email_verified == true`.
2. **No Passwords in Firestore**: Credentials are handled exclusively by Firebase Authentication. No password or secret fields exist in any Firestore entity or security rule allowlist.
3. **Immutable Ownership & Timestamps**: `uid` / `ownerId` and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time`.
4. **Strict Schema & Bounds**: Every string field enforces `.size()` limits, every ID enforces `^[a-zA-Z0-9_\-]+$`, and `keys().hasOnly(...)` blocks shadow/ghost fields.
5. **No Blanket List or Client-Delegated Queries**: `allow list` on `projects` and `history` explicitly verifies `userId == request.auth.uid` and `resource.data.ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Project Create**: Anonymous user writes to `/users/uid1/projects/p1` -> `PERMISSION_DENIED`.
2. **Cross-User Project Read**: Authenticated user `uid2` reads `/users/uid1/projects/p1` -> `PERMISSION_DENIED`.
3. **Cross-User Profile Read (PII Leak)**: Authenticated user `uid2` reads `/users/uid1/private/profile` -> `PERMISSION_DENIED`.
4. **Unverified Email Write**: Authenticated user `uid1` with `email_verified: false` writes to `/users/uid1/projects/p1` -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Create**: `uid1` creates `/users/uid1/projects/p1` with `ownerId: "uid2"` -> `PERMISSION_DENIED`.
6. **Shadow / Ghost Field Injection**: `uid1` creates `/users/uid1/private/profile` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
7. **Password Field Injection**: `uid1` creates `/users/uid1/private/profile` with `password: "secret"` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: `uid1` creates `/users/uid1/projects/bad$id/..` or 200-char ID -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: `uid1` creates project with `createdAt: Timestamp(2020-01-01)` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immortal Field Mutation**: `uid1` updates project changing `ownerId` or `createdAt` -> `PERMISSION_DENIED`.
11. **Oversized Payload (Denial of Wallet)**: `uid1` writes project with 10,000-char `payload` -> `PERMISSION_DENIED`.
12. **Unlisted / Unsupported Action Update**: `uid1` updates project `kind` or `payload` via a favorite-only action without updating `updatedAt == request.time` -> `PERMISSION_DENIED`.
