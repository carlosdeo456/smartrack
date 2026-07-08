const {
  normalizeParticipantRole,
  verifyShipmentChatToken,
} = require('../services/shipmentChatService');

function shipmentChatAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Shipment chat access token required' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = verifyShipmentChatToken(token);
    const role = normalizeParticipantRole(payload.role);

    if (!payload.shipmentId || !payload.trackingNumber || !role) {
      return res.status(401).json({ error: 'Invalid shipment chat access token' });
    }

    req.shipmentChat = {
      shipmentId: payload.shipmentId,
      trackingNumber: payload.trackingNumber,
      role,
      phone: payload.phone,
      token,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired shipment chat access token' });
  }
}

module.exports = shipmentChatAuth;
