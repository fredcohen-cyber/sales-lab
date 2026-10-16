// Append-only record of administrative and security-relevant actions.
export async function audit(q, { actorId = null, action, targetUserId = null, entityType = null, entityId = null, details = {}, ip = null }) {
  await q.query(
    `INSERT INTO audit_events (actor_id, action, target_user_id, entity_type, entity_id, details, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorId, action, targetUserId, entityType, entityId ? String(entityId) : null, JSON.stringify(details || {}), ip],
  );
}

export const AUDIT_LABELS = {
  'user.created': 'Account created',
  'user.updated': 'Profile updated',
  'user.role_changed': 'Role changed',
  'user.email_changed': 'Email changed',
  'user.deactivated': 'Account deactivated',
  'user.reactivated': 'Account reactivated',
  'user.sessions_revoked': 'Signed out of all sessions',
  'link.created': 'Password link created',
  'link.revoked': 'Password link revoked',
  'link.used': 'Password set from link',
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.login_failed': 'Failed sign-in',
  'auth.password_change_failed': 'Wrong current password when changing password',
  'auth.sign_in_cleared': 'Sign-in allowed again after failed attempts',
  'knowledge.created': 'Source created',
  'knowledge.version_added': 'Source version added',
  'knowledge.approved': 'Source version approved',
  'knowledge.archived': 'Source archived',
  'knowledge.restored': 'Source restored',
  'drill.created': 'Drill created',
  'drill.version_added': 'Drill updated',
  'drill.status_changed': 'Drill status changed',
  'assignment.created': 'Curriculum assigned',
  'assignment.cancelled': 'Assignment cancelled',
  'path.created': 'Learning path created',
  'path.updated': 'Learning path updated',
  'evaluation.confirmed': 'Evaluation confirmed',
  'evaluation.disputed': 'Evaluation disputed',
  'evaluation.reviewed': 'Evaluation reviewed',
  'coaching.restarted': 'Coaching restarted by a manager',
  'note.added': 'Coaching note added',
  'settings.rubric_changed': 'Scoring weights changed',
  'settings.thresholds_changed': 'Thresholds changed',
  'persona.updated': 'Buyer persona updated',
};
