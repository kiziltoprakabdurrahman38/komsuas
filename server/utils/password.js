const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password ?? ''), 'utf8').digest('hex');
}

function verifyPassword(password, sifreHash) {
  if (!sifreHash) return false;
  const incoming = hashPassword(password);
  const stored = String(sifreHash).trim().toLowerCase();
  return incoming === stored;
}

module.exports = {
  hashPassword,
  verifyPassword,
};
