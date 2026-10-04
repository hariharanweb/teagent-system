import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedEvent } from '../../lib/authContext.js';

const synthesizeLinesMock = vi.fn();
const usageMock = vi.fn();

vi.mock('../../llm/tts.js', () => ({ synthesizeLines: synthesizeLinesMock }));
vi.mock('../../db/profilesRepo.js', () => ({ incrementAndCheckDailyUsage: usageMock }));

const { handler } = await import('./narrate.js');

function event(body: unknown): AuthenticatedEvent {
  return {
    body: JSON.stringify(body),
    requestContext: { authorizer: { lambda: { profileId: 'p1', familyId: 'f1', role: 'kid' } } },
  } as unknown as AuthenticatedEvent;
}

describe('narrate handler', () => {
  beforeEach(() => {
    synthesizeLinesMock.mockReset();
    usageMock.mockReset().mockResolvedValue({ count: 1, withinCap: true });
  });

  it('returns clips for the requested lines and counts one narration use', async () => {
    synthesizeLinesMock.mockResolvedValue(['clipA', 'clipB']);

    const res = await handler(event({ language: 'hin', lines: ['अ', 'ब'] }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ clips: ['clipA', 'clipB'] });
    expect(synthesizeLinesMock).toHaveBeenCalledWith(['अ', 'ब'], 'hin');
    expect(usageMock).toHaveBeenCalledWith('p1', 'narration', expect.any(Number));
  });

  it('rejects an empty line list without spending usage', async () => {
    const res = await handler(event({ language: 'hin', lines: [] }));

    expect(res.statusCode).toBe(422);
    expect(usageMock).not.toHaveBeenCalled();
  });

  it('returns 429 once the daily cap is reached, without calling TTS', async () => {
    usageMock.mockResolvedValue({ count: 61, withinCap: false });

    const res = await handler(event({ language: 'kan', lines: ['ಅ'] }));

    expect(res.statusCode).toBe(429);
    expect(synthesizeLinesMock).not.toHaveBeenCalled();
  });
});
