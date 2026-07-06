-- Remove join-approval / pending-membership functionality.
-- Drops the `joinRequiresApproval` flag from galleries and communities, and the
-- `status` column (MembershipStatus enum) from community memberships. All
-- community memberships are now implicitly accepted.
ALTER TABLE `Gallery` DROP COLUMN `joinRequiresApproval`;
ALTER TABLE `Community` DROP COLUMN `joinRequiresApproval`;
ALTER TABLE `CommunityMembership` DROP COLUMN `status`;
