const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { SHIPMENT_CHAT_TOKEN_EXPIRE } = require('../config/env');
const { normalizePhone } = require('./smsService');

function normalizeParticipantRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return ['sender', 'receiver', 'admin'].includes(normalized) ? normalized : null;
}

function getShipmentPhoneForRole(shipment, role) {
  if (role === 'sender') return shipment.sender_phone;
  if (role === 'receiver') return shipment.recipient_phone;
  return null;
}

function getParticipantName(shipment, role) {
  if (role === 'sender') return shipment.sender_name || 'Sender';
  if (role === 'receiver') return shipment.recipient_name || 'Receiver';
  return 'Admin';
}

function verifyParticipantPhone(shipment, role, phone) {
  const expected = normalizePhone(getShipmentPhoneForRole(shipment, role));
  const actual = normalizePhone(phone);
  return Boolean(expected && actual && expected === actual);
}

function issueShipmentChatToken({ shipmentId, trackingNumber, role, phone }) {
  return jwt.sign(
    {
      type: 'shipment_chat',
      shipmentId,
      trackingNumber,
      role,
      phone: normalizePhone(phone),
    },
    process.env.JWT_SECRET,
    { expiresIn: SHIPMENT_CHAT_TOKEN_EXPIRE }
  );
}

function verifyShipmentChatToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload?.type !== 'shipment_chat') {
    throw new Error('Invalid shipment chat token');
  }
  return payload;
}

function formatShipmentMessage(row) {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    message: row.message_body,
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function listShipmentMessages(db = pool, shipmentId) {
  const result = await db.query(
    `SELECT id, shipment_id, sender_role, sender_name, message_body, is_read, read_at, created_at
     FROM shipment_messages
     WHERE shipment_id = $1
     ORDER BY created_at ASC, id ASC`,
    [shipmentId]
  );

  return result.rows.map(formatShipmentMessage);
}

async function markMessagesAsRead(db = pool, shipmentId, readerRole) {
  await db.query(
    `UPDATE shipment_messages
     SET is_read = true,
         read_at = NOW()
     WHERE shipment_id = $1
       AND sender_role <> $2
       AND is_read = false`,
    [shipmentId, readerRole]
  );
}

async function createShipmentMessage(db = pool, {
  shipmentId,
  senderRole,
  senderName,
  messageBody,
}) {
  const result = await db.query(
    `INSERT INTO shipment_messages (shipment_id, sender_role, sender_name, message_body)
     VALUES ($1, $2, $3, $4)
     RETURNING id, shipment_id, sender_role, sender_name, message_body, is_read, read_at, created_at`,
    [shipmentId, senderRole, senderName, messageBody]
  );

  return formatShipmentMessage(result.rows[0]);
}

module.exports = {
  normalizeParticipantRole,
  getShipmentPhoneForRole,
  getParticipantName,
  verifyParticipantPhone,
  issueShipmentChatToken,
  verifyShipmentChatToken,
  listShipmentMessages,
  markMessagesAsRead,
  createShipmentMessage,
};
