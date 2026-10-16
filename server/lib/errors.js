export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Sign in to continue.') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have access to this.') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
export const conflict = (code, message, details) => new HttpError(409, code, message, details);

// Wrap async route handlers so rejected promises reach the error handler (Express 5 does this natively,
// the wrapper keeps behaviour explicit and testable).
export const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Field names as people read them ("buyerLine" -> "buyer line"); numeric path parts are list positions.
const FIELD_LABELS = {
  learnerIds: 'rep',
  learnerId: 'rep',
  items: 'drill',
  drillId: 'drill',
  assessedDimensions: 'scored dimension',
  personas: 'buyer persona',
  roles: 'role',
  subjects: 'subject',
  sourceRefs: 'source',
  asOfDate: 'as-of date',
  goodLooksLike: 'description of a good answer',
  clientRequestId: 'request',
  minEvidence: 'scored examples required',
  proficiency: 'target score',
};
function fieldLabel(path) {
  const named = [...path].reverse().find((p) => typeof p === 'string');
  if (!named) return 'this value';
  return FIELD_LABELS[named] || named.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
}
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Turns a validation issue into a plain sentence. Messages written in our schemas are already sentences.
export function issueMessage(issue) {
  const label = fieldLabel(issue.path);
  switch (issue.code) {
    case 'custom':
      return issue.message;
    case 'invalid_type':
      return issue.received === 'undefined' || issue.received === 'null' ? sentence(`${label} is required.`) : sentence(`${label} has the wrong format.`);
    case 'too_small':
      if (issue.type === 'string') return issue.minimum <= 1 ? sentence(`${label} is required.`) : sentence(`${label} needs at least ${issue.minimum} characters.`);
      if (issue.type === 'array') return issue.minimum <= 1 ? `Choose at least one ${label}.` : `Choose at least ${issue.minimum} ${label}.`;
      return sentence(`${label} must be at least ${issue.minimum}.`);
    case 'too_big':
      if (issue.type === 'string') return sentence(`${label} can be at most ${issue.maximum} characters.`);
      if (issue.type === 'array') return sentence(`${label} can have at most ${issue.maximum} items.`);
      return sentence(`${label} must be at most ${issue.maximum}.`);
    case 'invalid_string':
      if (issue.validation === 'email') return 'Enter a valid email address.';
      return /^[A-Z].*\.$/.test(issue.message) ? issue.message : sentence(`${label} has the wrong format.`);
    case 'invalid_enum_value':
      return `Choose a valid ${label}.`;
    default:
      return /^[A-Z].*\.$/.test(issue.message) ? issue.message : sentence(`check the ${label}.`);
  }
}

export function zodToHttp(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issueMessage(issue);
  }
  const first = Object.values(fields)[0];
  return new HttpError(400, 'validation_failed', first || 'Check the form and try again.', { fields });
}

export function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw zodToHttp(result.error);
  return result.data;
}
