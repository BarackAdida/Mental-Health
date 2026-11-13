// WebDevApp/Server/circuitBreaker.js
//
// A small circuit breaker. After `failureThreshold` failed calls in a row it
// "opens" and refuses further calls for `cooldownMs`. When the cooldown ends it
// lets exactly ONE trial call through ("half-open"): success closes the circuit,
// failure opens it again with a fresh cooldown.
//
// State lives in server memory, so it resets when the server restarts.

function createBreaker({ failureThreshold = 3, cooldownMs = 30000, now = () => Date.now() } = {}) {
  let failures = 0;
  let openedAt = null;
  let trialInFlight = false;

  function state() {
    if (openedAt === null) return 'closed';
    return now() - openedAt >= cooldownMs ? 'half-open' : 'open';
  }

  return {
    // Ask before every call. false means: do not call, use the fallback.
    canCall() {
      if (openedAt === null) return true;
      if (now() - openedAt >= cooldownMs && !trialInFlight) {
        trialInFlight = true; // only one trial at a time
        return true;
      }
      return false;
    },
    // Report a good call. Returns true if this closed an open circuit.
    success() {
      const wasOpen = openedAt !== null;
      failures = 0;
      openedAt = null;
      trialInFlight = false;
      return wasOpen;
    },
    // Report a failed call. Returns true if the circuit is now open.
    failure() {
      trialInFlight = false;
      failures += 1;
      if (failures >= failureThreshold) {
        openedAt = now(); // opens, or restarts the cooldown after a failed trial
        return true;
      }
      return false;
    },
    state,
  };
}

module.exports = { createBreaker };
