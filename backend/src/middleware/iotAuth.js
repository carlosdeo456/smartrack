const { IOT_API_KEY } = require('../config/env');
const ApiError = require('../utils/ApiError');

function extractToken(req) {
  const authHeader = req.headers.authorization || '';

  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return req.headers['x-iot-api-key']?.trim() || null;
}

function iotAuth(req, res, next) {
  if (!IOT_API_KEY) {
    return next();
  }

  const token = extractToken(req);
  if (!token || token !== IOT_API_KEY) {
    return next(new ApiError(401, 'Invalid or missing IoT API key'));
  }

  return next();
}

module.exports = iotAuth;
