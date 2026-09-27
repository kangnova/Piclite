/**
 * GET /api/debug-static — uji import STATIS murni dari _shared.
 * Bila endpoint ini 500 sementara /api/debug 200 → rantai import statis
 * adalah penyebab FUNCTION_INVOCATION_FAILED.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json } from './_shared.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  json(res, 200, { staticImport: 'ok' });
}
