/**
 * Changes a profile's password/PIN by username — there's no self-service UI for this yet.
 *
 * Usage: npm run change-password -w @teagent/backend -- <username> <newPassword>
 * Point it at prod the same way as seedProfiles.ts, e.g.:
 *   DYNAMODB_ENDPOINT= AWS_PROFILE=personal AWS_REGION=us-east-1 \
 *     PROFILES_TABLE_NAME=TeagentProfiles-prod \
 *     npm run change-password -w @teagent/backend -- parent newSecurePassword
 */
import '../lib/loadEnv.js';
import { hashPassword } from '../auth/password.js';
import { findProfileByUsername, updatePasswordHash } from '../db/profilesRepo.js';

async function main() {
  const [username, newPassword] = process.argv.slice(2);
  if (!username || !newPassword) {
    console.error('Usage: npm run change-password -w @teagent/backend -- <username> <newPassword>');
    process.exitCode = 1;
    return;
  }

  const profile = await findProfileByUsername(username);
  if (!profile) {
    console.error(`No profile found for username "${username}".`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await updatePasswordHash(profile.familyId, profile.profileId, passwordHash);
  console.log(`Password updated for "${username}" (profileId ${profile.profileId}).`);
}

main().catch((err) => {
  console.error('Password change failed:', err);
  process.exitCode = 1;
});
