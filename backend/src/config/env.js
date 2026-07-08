/**
 * Centralized environment configuration.
 * All clients read API URL from their own env; backend reads network + DB here.
 */
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

module.exports = {
  NODE_ENV,
  isProduction,
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL,
  IOT_API_KEY: process.env.IOT_API_KEY,
  ENABLE_SIMULATED_GPS: process.env.ENABLE_SIMULATED_GPS === 'true',
  ENABLE_WHATSAPP_NOTIFICATIONS: process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'true',
  DEFAULT_SMS_COUNTRY: process.env.DEFAULT_SMS_COUNTRY || 'TZ',
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'twilio',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'SmartTrack',
  SMARTTRACK_CARRIER_NAME: process.env.SMARTTRACK_CARRIER_NAME || 'SmartTrack',
  NOTIFICATION_MAX_RETRIES: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3', 10),
  RAFIKI_SMS_BASE_URL: process.env.RAFIKI_SMS_BASE_URL || 'https://api.rafikisms.com/v1/vendor/send-sms',
  RAFIKI_SMS_API_KEY: process.env.RAFIKI_SMS_API_KEY,
  SHIPMENT_CHAT_TOKEN_EXPIRE: process.env.SHIPMENT_CHAT_TOKEN_EXPIRE || '7d',
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CORS_ALLOW_ALL: process.env.CORS_ALLOW_ALL === 'true',
};
