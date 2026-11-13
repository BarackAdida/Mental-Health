const { createBreaker } = require('../circuitBreaker');

describe('circuit breaker', () => {
  let t;
  let breaker;
  beforeEach(() => {
    t = 1000000;
    breaker = createBreaker({ failureThreshold: 3, cooldownMs: 30000, now: () => t });
  });

  test('stays closed below the failure limit', () => {
    breaker.failure();
    breaker.failure();
    expect(breaker.state()).toBe('closed');
    expect(breaker.canCall()).toBe(true);
  });

  test('opens after 3 failures in a row and refuses calls', () => {
    breaker.failure();
    breaker.failure();
    expect(breaker.failure()).toBe(true);
    expect(breaker.state()).toBe('open');
    expect(breaker.canCall()).toBe(false);
  });

  test('a success resets the count, so failures must be in a row', () => {
    breaker.failure();
    breaker.failure();
    breaker.success();
    breaker.failure();
    breaker.failure();
    expect(breaker.state()).toBe('closed');
  });

  test('after the cooldown it lets exactly one trial call through', () => {
    breaker.failure(); breaker.failure(); breaker.failure();
    t += 29999;
    expect(breaker.canCall()).toBe(false);
    t += 1;
    expect(breaker.state()).toBe('half-open');
    expect(breaker.canCall()).toBe(true);   // the trial
    expect(breaker.canCall()).toBe(false);  // everyone else still waits
  });

  test('a good trial closes the circuit', () => {
    breaker.failure(); breaker.failure(); breaker.failure();
    t += 30000;
    breaker.canCall();
    expect(breaker.success()).toBe(true);
    expect(breaker.state()).toBe('closed');
    expect(breaker.canCall()).toBe(true);
  });

  test('a failed trial opens it again with a fresh cooldown', () => {
    breaker.failure(); breaker.failure(); breaker.failure();
    t += 30000;
    breaker.canCall();
    breaker.failure();
    expect(breaker.state()).toBe('open');
    t += 29999;
    expect(breaker.canCall()).toBe(false);
    t += 1;
    expect(breaker.canCall()).toBe(true);
  });
});
