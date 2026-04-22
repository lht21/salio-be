import jwt from 'jsonwebtoken';
import crypto from 'crypto';    
 
// ─── Generate token pair ─────────────────────────────────────────────────────
 
/**
 * Creates both accessToken and refreshToken for a user.
 * @param {Object} payload  - { userId, email }
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer: 'salio-api',
    audience: 'salio-client',
  });
 
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'salio-api',
    audience: 'salio-client',
  });
 
  return { accessToken, refreshToken };
};
 
// ─── Verify tokens ───────────────────────────────────────────────────────────
 
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: 'salio-api',
    audience: 'salio-client',
  });
 
const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'salio-api',
    audience: 'salio-client',
  });


const generateOtp = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const range = max - min + 1;
  const randomBytes = crypto.randomBytes(4);
  const randomInt = randomBytes.readUInt32BE(0);
  return String(min + (randomInt % range));
};


export { generateTokens, verifyAccessToken, verifyRefreshToken, generateOtp };