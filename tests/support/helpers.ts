import { rm } from 'node:fs/promises';
import path from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import { MOCK_URL } from '../../playwright.config';

/** En række som mock-serveren har modtaget, svarende til en række i arket. */
export type MockRow = {
  date: string;
  name: string;
  message: string;
  approved: boolean;
  secretOk?: boolean;
};

/**
 * Netlify Dev gemmer Blobs på disken, så hastighedsgrænsen overlever
 * både testkørsler og genstart. Vi rydder den mellem tests, ellers ville
 * den sjette POST i hele suiten få 429.
 */
const blobKeyDirs = ['entries', 'metadata'].map((kind) =>
  path.join(
    process.cwd(),
    '.netlify',
    'blobs-serve',
    kind,
    'unlinked',
    'site:guestbook-rate-limit',
  ),
);

export const clearRateLimit = async () => {
  await Promise.all(
    blobKeyDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
};

export const resetMock = async (request: APIRequestContext) => {
  await request.post(`${MOCK_URL}/__test/reset`);
};

export const seedMock = async (
  request: APIRequestContext,
  entries: MockRow[],
) => {
  await request.post(`${MOCK_URL}/__test/seed`, { data: { entries } });
};

export const mockRows = async (
  request: APIRequestContext,
): Promise<MockRow[]> => {
  const res = await request.get(`${MOCK_URL}/__test/rows`);
  const body = (await res.json()) as { rows: MockRow[] };
  return body.rows;
};

export const setMockFailure = async (
  request: APIRequestContext,
  mode: 'error' | 'off',
) => {
  await request.post(`${MOCK_URL}/__test/fail`, { data: { mode } });
};

/** Nulstiller både mock-arket og hastighedsgrænsen. */
export const resetBackend = async (request: APIRequestContext) => {
  await Promise.all([resetMock(request), clearRateLimit()]);
};

/** En godkendt hilsen, klar til at blive vist på siden. */
export const approvedEntry = (
  name: string,
  message: string,
  date = '2026-01-15T12:00:00.000Z',
): MockRow => ({ date, name, message, approved: true });
