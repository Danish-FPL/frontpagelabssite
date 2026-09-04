import { staffList, json } from '../../shared/auth.js';

// Pre-auth on purpose: the login page fills its name field from this, and the
// list is staff first names, not a secret.
export const onRequest = ({ env }) => json({ staff: staffList(env) });
