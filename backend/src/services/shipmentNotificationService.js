const pool = require('../config/database');
const {
  sendMessage,
  buildConversationNotificationMessage,
  buildCreationMessage,
  buildStatusMessage,
} = require('./smsService');
const { ENABLE_WHATSAPP_NOTIFICATIONS } = require('../config/env');

const TRACKING_MILESTONES = new Set([
  'dispatched',
  'out_for_delivery',
  'delayed',
  'delivered',
]);

function buildRecipients(shipment) {
  return [
    {
      role: 'sender',
      phone: shipment.sender_phone,
    },
    {
      role: 'receiver',
      phone: shipment.recipient_phone,
    },
  ].filter((recipient) => Boolean(recipient.phone));
}

async function logNotificationAttempt(db, {
  shipmentId,
  eventType,
  channel,
  recipientRole,
  recipientPhone,
  messageBody,
  providerName,
  providerMessageId,
  deliveryStatus,
  retryCount,
  errorMessage,
  simulated,
  metadata,
}) {
  await db.query(
    `INSERT INTO notification_logs (
      shipment_id, event_type, channel, recipient_role, recipient_phone,
      message_body, provider_name, provider_message_id, delivery_status,
      retry_count, error_message, simulated, metadata
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13
    )`,
    [
      shipmentId,
      eventType,
      channel,
      recipientRole,
      recipientPhone,
      messageBody,
      providerName,
      providerMessageId,
      deliveryStatus,
      retryCount,
      errorMessage,
      simulated,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

async function dispatchShipmentNotifications({
  db = pool,
  shipment,
  eventType,
  metadata = {},
  recipientRoles = null,
  buildMessage,
}) {
  if (!shipment?.id) {
    return { sent: [], failed: [], skipped: true, reason: 'Shipment is required' };
  }

  const recipients = buildRecipients(shipment).filter((recipient) => (
    !Array.isArray(recipientRoles) || recipientRoles.includes(recipient.role)
  ));
  if (recipients.length === 0) {
    return { sent: [], failed: [], skipped: true, reason: 'No recipient phone numbers provided' };
  }

  const channels = ENABLE_WHATSAPP_NOTIFICATIONS ? ['sms', 'whatsapp'] : ['sms'];

  const results = await Promise.all(recipients.flatMap((recipient) => channels.map(async (channel) => {
    const messageBody = buildMessage(recipient.role);

    if (!messageBody) {
      const skipped = {
        success: false,
        skipped: true,
        role: recipient.role,
        phone: recipient.phone,
        channel,
        provider: 'template',
        error: `No template available for ${eventType}/${recipient.role}`,
        retryCount: 0,
      };

      await logNotificationAttempt(db, {
        shipmentId: shipment.id,
        eventType,
        channel,
        recipientRole: recipient.role,
        recipientPhone: recipient.phone,
        messageBody: '',
        providerName: skipped.provider,
        providerMessageId: null,
        deliveryStatus: 'skipped',
        retryCount: 0,
        errorMessage: skipped.error,
        simulated: false,
        metadata,
      });

      return skipped;
    }

    const result = await sendMessage({
      to: recipient.phone,
      body: messageBody,
      channel,
    });

    await logNotificationAttempt(db, {
      shipmentId: shipment.id,
      eventType,
      channel,
      recipientRole: recipient.role,
      recipientPhone: result.phone || recipient.phone,
      messageBody,
      providerName: result.provider || 'unknown',
      providerMessageId: result.providerMessageId || null,
      deliveryStatus: result.success ? 'sent' : 'failed',
      retryCount: result.retryCount || 0,
      errorMessage: result.error || null,
      simulated: Boolean(result.simulated),
      metadata,
    });

    return {
      ...result,
      role: recipient.role,
      body: messageBody,
    };
  })));

  return {
    sent: results.filter((result) => result.success),
    failed: results.filter((result) => !result.success && !result.skipped),
    skipped: results.filter((result) => result.skipped),
    simulated: results.some((result) => result.simulated),
  };
}

async function notifyShipmentCreated({
  db = pool,
  shipment,
  trackUrl,
}) {
  return dispatchShipmentNotifications({
    db,
    shipment,
    eventType: 'shipment.created',
    metadata: { status: shipment.status || 'pending' },
    buildMessage: (recipientRole) => buildCreationMessage({
      shipment,
      trackUrl,
      recipientRole,
    }),
  });
}

async function notifyShipmentConversationMessage({
  db = pool,
  shipment,
  senderRole,
  messageBody,
  trackUrl,
}) {
  const recipientRole = senderRole === 'sender' ? 'receiver' : 'sender';

  return dispatchShipmentNotifications({
    db,
    shipment,
    eventType: 'shipment.message',
    metadata: { senderRole },
    recipientRoles: [recipientRole],
    buildMessage: (role) => buildConversationNotificationMessage({
      shipment,
      trackUrl,
      senderRole,
      recipientRole: role,
      messageBody,
    }),
  });
}

async function notifyShipmentMilestone({
  db = pool,
  shipment,
  previousStatus,
  nextStatus,
  trackUrl,
}) {
  if (!shipment?.id) {
    return { sent: [], failed: [], skipped: true, reason: 'Shipment is required' };
  }

  if (previousStatus === nextStatus) {
    return { sent: [], failed: [], skipped: true, reason: 'Status unchanged' };
  }

  if (!TRACKING_MILESTONES.has(nextStatus)) {
    return { sent: [], failed: [], skipped: true, reason: `Status ${nextStatus} is not a messaging milestone` };
  }

  return dispatchShipmentNotifications({
    db,
    shipment,
    eventType: `shipment.${nextStatus}`,
    metadata: { previousStatus, nextStatus },
    buildMessage: (recipientRole) => buildStatusMessage({
      shipment,
      trackUrl,
      milestone: nextStatus,
      recipientRole,
    }),
  });
}

module.exports = {
  TRACKING_MILESTONES,
  notifyShipmentConversationMessage,
  notifyShipmentCreated,
  notifyShipmentMilestone,
};
