const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('./env');

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  // Throws on malformed / expired / invalid-signature tokens.
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
