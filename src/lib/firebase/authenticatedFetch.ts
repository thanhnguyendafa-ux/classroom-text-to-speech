import { auth } from './firebaseClient';

export function buildAuthHeaders(
  headers: Record<string, string>,
  token: string | null,
): Record<string, string> {
  return token
    ? { ...headers, Authorization: `Bearer ${token}` }
    : { ...headers };
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = buildAuthHeaders(
    (init.headers ?? {}) as Record<string, string>,
    token,
  );
  return fetch(input, { ...init, headers });
}
