-- One-time data fix: create a Profile row for every user missing one,
-- then link it via the user's profileId. Idempotent — re-running is a no-op
-- because the INSERT ... SELECT only matches users with profileId IS NULL
-- AND no existing profile rows. Default nick_name matches the registration
-- flow: "کاربر {user.id}".

BEGIN;

-- 1) Insert missing profiles (only for users that truly have none).
INSERT INTO profile (nick_name, "userId")
SELECT 'کاربر ' || u.id, u.id
FROM "user" u
WHERE u."profileId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM profile p WHERE p."userId" = u.id);

-- 2) Link each user to THEIR profile (by userId, not by order).
--    Only fills NULL profileIds — never overwrites an existing link.
UPDATE "user" u
SET "profileId" = p.id
FROM profile p
WHERE p."userId" = u.id
  AND u."profileId" IS NULL;

COMMIT;

-- 3) Report remaining users without a profile (should be 0 rows).
SELECT u.id, u.username
FROM "user" u
WHERE u."profileId" IS NULL
   OR NOT EXISTS (SELECT 1 FROM profile p WHERE p."userId" = u.id);
