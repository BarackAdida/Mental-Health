const { fetchWithRetry } = require('../resilientFetch');

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('retries 5xx responses at most twice and returns a later success', async () => {
    global.fetch
      .mockResolvedValueOnce({ status: 501, headers: new Headers() })
      .mockResolvedValueOnce({ status: 200, headers: new Headers() });

    const response = await fetchWithRetry('https://partner.invalid/items', {}, {
      timeoutMs: 100,
      retries: 2,
      delayMs: 0,
    });

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  test.each([401, 404])('does not retry a %i response', async (status) => {
    global.fetch.mockResolvedValueOnce({ status, headers: new Headers() });

    const response = await fetchWithRetry('https://partner.invalid/items', {}, {
      retries: 2,
      delayMs: 0,
    });

    expect(response.status).toBe(status);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('does not retry writes, even after a 503', async () => {
    global.fetch.mockResolvedValueOnce({ status: 503, headers: new Headers() });

    const response = await fetchWithRetry('https://partner.invalid/items', {
      method: 'POST',
      body: '{}',
    }, { retries: 2, delayMs: 0 });

    expect(response.status).toBe(503);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('honors Retry-After on a 429 response', async () => {
    jest.useFakeTimers();
    global.fetch
      .mockResolvedValueOnce({
        status: 429,
        headers: new Headers({ 'Retry-After': '3' }),
      })
      .mockResolvedValueOnce({ status: 200, headers: new Headers() });

    const pending = fetchWithRetry('https://partner.invalid/items', {}, {
      timeoutMs: 10_000,
      retries: 1,
      delayMs: 0,
    });

    await jest.advanceTimersByTimeAsync(2999);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toMatchObject({ status: 200 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('retries a timeout only up to the configured limit', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    global.fetch.mockRejectedValue(timeout);

    await expect(fetchWithRetry('https://partner.invalid/items', {}, {
      timeoutMs: 100,
      retries: 2,
      delayMs: 0,
    })).rejects.toHaveProperty('name', 'TimeoutError');

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
