import { guard, ok } from '@/lib/api';
import { testConnections } from '@/lib/connections';
import { readState } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST() {
  const blocked = await guard();
  if (blocked) return blocked;

  const state = await readState();
  const results = await testConnections(state);
  return ok({ results });
}
