// PIN and session primitives. Pure: hashing and storage are injected.
function normalizePin(raw) {
  var s = String(raw == null ? '' : raw).trim();
  return /^\d{6}$/.test(s) ? s : null;
}

function generatePin(random) {
  var s = '';
  for (var i = 0; i < 6; i++) s += Math.floor(random() * 10);
  return s;
}

function hashPin(pin, salt, sha256Hex) {
  return sha256Hex(salt + ':' + pin);
}

function verifyPin(pin, user, sha256Hex) {
  return hashPin(pin, user.salt, sha256Hex) === user.pinHash;
}

function checkLockout(user, nowMs) {
  var until = user.lockedUntil || 0;
  return { locked: until > nowMs, until: until };
}

function recordFailure(user, nowMs, cfg) {
  var u = Object.assign({}, user);
  u.failedCount = (user.failedCount || 0) + 1;
  if (u.failedCount >= cfg.maxFailures) {
    u.lockedUntil = nowMs + cfg.lockMs;
    u.failedCount = 0;
  }
  return u;
}

function recordSuccess(user) {
  return Object.assign({}, user, { failedCount: 0, lockedUntil: 0 });
}

// kv: {get(k), put(k, v, ttlSec)}. Session value is "userId|expiresMs".
function createSessionStore(kv, random, ttlMs) {
  ttlMs = ttlMs || 21600000;
  return {
    create: function (userId, nowMs) {
      var token = '';
      for (var i = 0; i < 4; i++) token += Math.floor(random() * 0x100000000).toString(16).padStart(8, '0');
      kv.put('sess:' + token, userId + '|' + (nowMs + ttlMs), Math.ceil(ttlMs / 1000));
      return token;
    },
    resolve: function (token, nowMs) {
      if (!token) return null;
      var v = kv.get('sess:' + token);
      if (!v) return null;
      var parts = v.split('|');
      return Number(parts[1]) > nowMs ? parts[0] : null;
    }
  };
}
