const axios = require('axios');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const {
  DEFAULT_SMS_COUNTRY,
  NOTIFICATION_MAX_RETRIES,
  RAFIKI_SMS_BASE_URL,
  RAFIKI_SMS_API_KEY,
  SMS_PROVIDER,
  SMS_SENDER_ID,
  SMARTTRACK_CARRIER_NAME,
} = require('../config/env');

const PROVIDER_NAME = 'twilio';
const RAFIKI_PROVIDER_NAME = 'rafikisms';
const PRICE_PER_KG = 3000;

function normalizePhone(phone) {
  if (!phone) return null;

  const input = String(phone).trim();
  const parsed = input.startsWith('+')
    ? parsePhoneNumberFromString(input)
    : parsePhoneNumberFromString(input, DEFAULT_SMS_COUNTRY);

  if (!parsed || !parsed.isValid()) {
    return null;
  }

  return parsed.number;
}

function isSmsConfigured() {
  if (SMS_PROVIDER === RAFIKI_PROVIDER_NAME) {
    return Boolean(
      RAFIKI_SMS_BASE_URL
      && RAFIKI_SMS_API_KEY
      && SMS_SENDER_ID
    );
  }

  return Boolean(
    process.env.TWILIO_ACCOUNT_SID
    && process.env.TWILIO_AUTH_TOKEN
    && process.env.TWILIO_PHONE_NUMBER
  );
}

function isWhatsappConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID
    && process.env.TWILIO_AUTH_TOKEN
    && (process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEstimatedDelivery(value) {
  if (!value) return 'soon';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'soon';
  }

  return date.toLocaleString();
}

function calculateShipmentPrice(weight) {
  const numericWeight = Number(weight);
  if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
    return null;
  }

  return Math.round(numericWeight * PRICE_PER_KG);
}

function formatTsh(amount) {
  if (!Number.isFinite(amount)) return null;
  return `${amount.toLocaleString('en-US')} Tsh`;
}

function buildPriceLine(shipment) {
  const price = calculateShipmentPrice(shipment.weight);
  if (!price) {
    return 'Price: pending weight confirmation';
  }

  return `Price: ${formatTsh(price)} (${shipment.weight} kg @ ${formatTsh(PRICE_PER_KG)}/kg)`;
}

function compactSmsBody(body, maxLength = 160) {
  const compacted = String(body || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatPhoneForRafiki(phone) {
  const normalized = normalizePhone(phone);
  return normalized ? normalized.replace(/^\+/, '') : null;
}

function buildShipmentSmsBody(shipment, trackUrl) {
  const tracking = shipment.tracking_number;
  const sender = shipment.sender_name || 'Sender';
  const receiver = shipment.recipient_name || 'Receiver';
  const route = `${shipment.origin_location} → ${shipment.destination_location}`;
  const priceLine = buildPriceLine(shipment);
  return `SmartTrack ${tracking}\nFrom: ${sender}\nTo: ${receiver}\nRoute: ${route}\n${priceLine}\nTrack live: ${trackUrl}`;
}

function buildCreationMessage({ shipment, trackUrl, recipientRole }) {
  const tracking = shipment.tracking_number;
  const sender = shipment.sender_name || 'Sender';
  const receiver = shipment.recipient_name || 'Receiver';
  const carrier = shipment.carrier_name || SMARTTRACK_CARRIER_NAME;
  const eta = formatEstimatedDelivery(shipment.expected_delivery);
  const priceLine = buildPriceLine(shipment);

  const templates = {
    sender: `Hi ${sender}, your shipment ${tracking} to ${receiver} has been created with ${carrier}. ETA: ${eta}. ${priceLine}. Track: ${trackUrl}`,
    receiver: `Hi ${receiver}, a shipment ${tracking} from ${sender} has been created with ${carrier}. ETA: ${eta}. ${priceLine}. Track: ${trackUrl}`,
  };

  return templates[recipientRole] || null;
}

function buildConversationNotificationMessage({
  shipment,
  trackUrl,
  senderRole,
  recipientRole,
  messageBody,
}) {
  const tracking = shipment.tracking_number;
  const sender = shipment.sender_name || 'Sender';
  const receiver = shipment.recipient_name || 'Receiver';
  const speaker = senderRole === 'sender' ? sender : receiver;
  const preview = String(messageBody || '').trim().slice(0, 120);
  const intro = recipientRole === 'sender'
    ? `Hi ${sender},`
    : `Hi ${receiver},`;

  return `${intro} new parcel message for ${tracking} from ${speaker}: "${preview}" Open SmartTrack to reply: ${trackUrl}`;
}

function buildStatusMessage({ shipment, trackUrl, milestone, recipientRole }) {
  const tracking = shipment.tracking_number;
  const sender = shipment.sender_name || 'Sender';
  const receiver = shipment.recipient_name || 'Receiver';
  const carrier = shipment.carrier_name || SMARTTRACK_CARRIER_NAME;
  const eta = formatEstimatedDelivery(shipment.expected_delivery);
  const route = `${shipment.origin_location} → ${shipment.destination_location}`;
  const priceLine = buildPriceLine(shipment);

  const templates = {
    dispatched: {
      sender: `Hi ${sender}, your parcel ${tracking} to ${receiver} has been dispatched by ${carrier}. ETA: ${eta}. ${priceLine}. Track: ${trackUrl}`,
      receiver: `Hi ${receiver}, your parcel ${tracking} from ${sender} has been dispatched by ${carrier}. ETA: ${eta}. ${priceLine}. Track: ${trackUrl}`,
    },
    out_for_delivery: {
      sender: `Hi ${sender}, your parcel ${tracking} to ${receiver} is out for delivery with ${carrier}. ETA: ${eta}. ${priceLine}. Track: ${trackUrl}`,
      receiver: `Good news ${receiver}, your parcel ${tracking} from ${sender} is out for delivery with ${carrier}. ETA: ${eta}. ${priceLine}. Track: ${trackUrl}`,
    },
    delayed: {
      sender: `Hi ${sender}, parcel ${tracking} to ${receiver} is delayed on the route ${route}. Updated ETA: ${eta}. ${priceLine}. Track: ${trackUrl}`,
      receiver: `Hi ${receiver}, your parcel ${tracking} from ${sender} is delayed. Updated ETA: ${eta}. ${priceLine}. Track: ${trackUrl}`,
    },
    delivered: {
      sender: `Hi ${sender}, your parcel ${tracking} to ${receiver} has been delivered by ${carrier}. ${priceLine}. Track: ${trackUrl}`,
      receiver: `Delivered! Your parcel ${tracking} from ${sender} has arrived. ${priceLine}. Thank you for using ${carrier}.`,
    },
  };

  return templates[milestone]?.[recipientRole] || null;
}

async function sendViaRafikiSms(phone, body) {
  const providerPhone = formatPhoneForRafiki(phone);
  if (!providerPhone) {
    return {
      success: false,
      channel: 'sms',
      phone,
      provider: RAFIKI_PROVIDER_NAME,
      error: 'Invalid phone number format for RafikiSMS',
      retryCount: 0,
    };
  }

  try {
    const response = await axios.post(
      RAFIKI_SMS_BASE_URL,
      {
        phone: providerPhone,
        message: compactSmsBody(body, 160),
        sender_id: String(SMS_SENDER_ID || 'SmartTrack').slice(0, 11),
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': RAFIKI_SMS_API_KEY,
        },
        timeout: 15000,
      }
    );

    if (response.data?.status !== 'success') {
      const details = response.data?.errors
        ? JSON.stringify(response.data.errors)
        : response.data?.message || 'Failed to queue SMS';
      return {
        success: false,
        channel: 'sms',
        phone,
        provider: RAFIKI_PROVIDER_NAME,
        error: details,
        retryCount: 0,
      };
    }

    return {
      success: true,
      channel: 'sms',
      phone,
      provider: RAFIKI_PROVIDER_NAME,
      providerMessageId: response.data?.data?.message_id || response.data?.data?.id || null,
      retryCount: 0,
    };
  } catch (err) {
    const details = err.response?.data?.errors
      ? JSON.stringify(err.response.data.errors)
      : err.response?.data?.message || err.message;
    return {
      success: false,
      channel: 'sms',
      phone,
      provider: RAFIKI_PROVIDER_NAME,
      error: details,
      retryCount: 0,
    };
  }
}

async function sendMessage({ to, body, channel = 'sms', maxRetries = NOTIFICATION_MAX_RETRIES }) {
  const phone = normalizePhone(to);
  if (!phone) {
    return {
      success: false,
      channel,
      phone: to,
      provider: PROVIDER_NAME,
      error: 'Invalid phone number. Use E.164 format or a valid local number.',
      retryCount: 0,
    };
  }

  const configured = channel === 'whatsapp' ? isWhatsappConfigured() : isSmsConfigured();

  if (!configured) {
    console.log(`[${channel.toUpperCase()} simulated] To ${phone}: ${body}`);
    return {
      success: true,
      simulated: true,
      channel,
      phone,
      provider: 'simulated',
      providerMessageId: null,
      retryCount: 0,
    };
  }

  if (channel === 'sms' && SMS_PROVIDER === RAFIKI_PROVIDER_NAME) {
    return sendViaRafikiSms(phone, body);
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = channel === 'whatsapp'
    ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER}`
    : process.env.TWILIO_PHONE_NUMBER;
  const toValue = channel === 'whatsapp' ? `whatsapp:${phone}` : phone;
  const attempts = Math.max(1, maxRetries);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        new URLSearchParams({ To: toValue, From: from, Body: body }),
        {
          auth: { username: sid, password: token },
          timeout: 15000,
        }
      );

      return {
        success: true,
        channel,
        phone,
        provider: PROVIDER_NAME,
        providerMessageId: response.data?.sid || null,
        retryCount: attempt - 1,
      };
    } catch (err) {
      const message = err.response?.data?.message || err.message;

      if (attempt === attempts) {
        console.error(`[${channel.toUpperCase()} failed] To ${phone}: ${message}`);
        return {
          success: false,
          channel,
          phone,
          provider: PROVIDER_NAME,
          error: message,
          retryCount: attempt - 1,
        };
      }

      await sleep(500 * attempt);
    }
  }

  return {
    success: false,
    channel,
    phone,
    provider: PROVIDER_NAME,
    error: 'Unexpected messaging failure',
    retryCount: Math.max(0, attempts - 1),
  };
}

async function sendSms(to, body) {
  return sendMessage({ to, body, channel: 'sms' });
}

async function sendShipmentSmsToParties(shipment, trackUrl) {
  const body = buildShipmentSmsBody(shipment, trackUrl);
  const phones = [
    shipment.sender_phone,
    shipment.recipient_phone,
  ].filter(Boolean);

  const unique = [...new Set(phones.map(normalizePhone).filter(Boolean))];
  if (unique.length === 0) {
    return { sent: [], failed: [], skipped: true, reason: 'No phone numbers provided' };
  }

  const results = await Promise.all(
    unique.map((phone) => sendSms(phone, body))
  );

  return {
    sent: results.filter((r) => r.success),
    failed: results.filter((r) => !r.success),
    simulated: results.some((r) => r.simulated),
  };
}

module.exports = {
  sendMessage,
  sendSms,
  sendShipmentSmsToParties,
  buildShipmentSmsBody,
  buildCreationMessage,
  buildConversationNotificationMessage,
  buildStatusMessage,
  isSmsConfigured,
  isWhatsappConfigured,
  normalizePhone,
};
