# Pending migration notes (deferred until after Phase 4)

Database migrations are intentionally deferred. No migration files were
created in Phase 2 and no schema change was applied. The items below were
found by reading the current entities and toggle logic; they must be handled
by the dedicated migration phase, not ad hoc.

## 1. Missing uniqueness on `blog_like(userId, blogId)`

- **Affected table/column:** `blog_like` (`userId`, `blogId`).
- **Reason:** `BlogLikeEntity` (`src/modules/blog/entities/like.entity.ts`)
  has no `@Unique` constraint, while its sibling `BlogBookmarkEntity`
  already enforces `@Unique(['userId', 'blogId'])`. `LikeToggle`
  (`src/modules/blog/service/blog.service.ts`) does find-then-insert, so two
  concurrent like requests from the same user can double-insert the same pair.
- **Compatibility:** adding the constraint requires a data cleanup first —
  delete duplicate `(userId, blogId)` pairs, keeping one row each. Deploy
  ordering: cleanup → add unique index → (later, optionally) make the toggle
  race-safe by catching the unique-violation instead of pre-checking.
- **Caution:** `GET /blog/like/:id` toggles today and returns 201 in both
  branches; a unique-violation path must preserve that contract.

## 2. Missing uniqueness on `follow(followerId, followingId)`

- **Affected table/column:** `follow` (`followerId`, `followingId`).
- **Reason:** `FollowEntity` (`src/modules/user/entities/follow.entity.ts`)
  has no `@Unique` constraint. `followToggle`
  (`src/modules/user/user.service.ts`) does find-then-insert, so two
  concurrent follow requests can double-insert the same pair (inflating
  follower counts).
- **Compatibility:** same ordering as above — deduplicate existing pairs
  first, then add the unique index. `GET /user/follow/:id` contract
  (toggle with followed/unfollowed messages) must be preserved.

## 3. No other schema change proposed

- `EntityName` enum values, `@Column` names, and the `UserEntity.password`
  column were verified unchanged in Phase 2. The `blogCategoty` enum *key*
  typo is TypeScript-only (the stored value `'blog_category'` is correct)
  and needs no migration.
