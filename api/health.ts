import { applySecurityHeaders } from '../src/server/httpSecurity.js';
import { createHealthResponse } from '../src/server/health.js';
import { checkFirestoreConnection } from '../src/server/storage.js';

export default async function handler(req: any, res: any) {
  applySecurityHeaders(req, res, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const response = await createHealthResponse(checkFirestoreConnection);
  res.status(response.statusCode).json(response.body);
}
