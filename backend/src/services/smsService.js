const axios = require('axios');

function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  return cleaned.length >= 9 ? cleaned : null;
}

function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID
    && process.env.TWILIO_AUTH_TOKEN
    && process.env.TWILIO_PHONE_NUMBER
  );
}

async function sendSms(to, body) {
  const phone = normalizePhone(to);
  if (!phone) {
    return { success: false, error: 'Invalid phone number', phone: to };
  }

  if (!isSmsConfigured()) {
    console.log(`[SMS simulated] To ${phone}: ${body}`);
    return { success: true, simulated: true, phone };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  try {
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      new URLSearchParams({ To: phone, From: from, Body: body }),
      {
        auth: { username: sid, password: token },
        timeout: 15000,
      }
    );
    return { success: true, phone, sid: response.data?.sid };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    console.error(`[SMS failed] To ${phone}: ${message}`);
    return { success: false, phone, error: message };
  }
}

function buildShipmentSmsBody(shipment, trackUrl) {
  const tracking = shipment.tracking_number;
  const sender = shipment.sender_name || 'Sender';
  const receiver = shipment.recipient_name || 'Receiver';
  const route = `${shipment.origin_location} → ${shipment.destination_location}`;
  return `SmartTrack ${tracking}\nFrom: ${sender}\nTo: ${receiver}\nRoute: ${route}\nTrack live: ${trackUrl}`;
}

async function sendShipmentSmsToParties(shipment, trackUrl) {
  const body = buildShipmentSmsBody(shipment, trackUrl);
  const phones = [
    shipment.sender_phone,
    shipment.recipient_phone,
  ].filter(Boolean);

  const unique = [...new Set(phones.map(normalizePhone).filter(Boolean))];
  if (unique.length === 0) {
    return { sent: [], skipped: true, reason: 'No phone numbers provided' };
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
  sendSms,
  sendShipmentSmsToParties,
  buildShipmentSmsBody,
  isSmsConfigured,
  normalizePhone,
};
