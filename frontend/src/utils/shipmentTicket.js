import QRCode from 'qrcode';

const TICKET_PRICE_PER_KG = 3000;

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ticketStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0fdf4; color: #064e3b; padding: 24px; }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 8px; color: #047857; }
    .sub { font-size: 13px; color: #059669; margin-bottom: 24px; }
    .ticket {
      background: #fff;
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .ticket-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #059669;
      margin-bottom: 12px;
    }
    .tracking {
      font-family: 'Courier New', monospace;
      font-size: 26px;
      font-weight: 800;
      color: #047857;
      margin-bottom: 16px;
    }
    .qr-wrap {
      text-align: center;
      margin: 16px 0 20px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 10px;
      border: 1px dashed #a7f3d0;
    }
    .qr-wrap img { width: 160px; height: 160px; }
    .qr-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #059669;
      margin-top: 8px;
    }
    .party-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 16px 0;
    }
    .party-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 12px;
    }
    .party-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #059669;
      margin-bottom: 4px;
    }
    .party-name {
      font-size: 16px;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 4px;
    }
    .party-phone { font-size: 13px; color: #047857; font-weight: 600; }
    .row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; font-size: 14px; }
    .label { color: #6b7280; font-size: 12px; }
    .value { font-weight: 600; color: #111827; }
    .route { font-size: 16px; font-weight: 700; margin: 12px 0; color: #065f46; }
    .url { font-size: 12px; color: #059669; margin-top: 12px; word-break: break-all; }
    @media print {
      body { background: #fff; padding: 0; }
      .ticket { break-inside: avoid; }
    }
  `;
}

export function getTrackUrl(shipment) {
  return shipment.webUrl || shipment.web_url
    || `${window.location.origin}/track/${encodeURIComponent(shipment.tracking_number)}`;
}

export async function getShipmentQrDataUrl(url) {
  return QRCode.toDataURL(url, {
    width: 200,
    margin: 2,
    color: { dark: '#047857', light: '#ffffff' },
  });
}

export function calculateShipmentPrice(weight) {
  const numericWeight = Number(weight);
  if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
    return null;
  }

  return Math.round(numericWeight * TICKET_PRICE_PER_KG);
}

export function formatTsh(amount) {
  if (!Number.isFinite(amount)) return '—';
  return `${amount.toLocaleString('en-US')} Tsh`;
}

export function getTicketPricePerKg() {
  return TICKET_PRICE_PER_KG;
}

export async function buildShipmentTicketsHtml(shipment, qrDataUrl) {
  const tracking = escapeHtml(shipment.tracking_number);
  const origin = escapeHtml(shipment.origin_location);
  const dest = escapeHtml(shipment.destination_location);
  const contents = escapeHtml(shipment.contents || '—');
  const price = formatTsh(calculateShipmentPrice(shipment.weight));
  const senderName = escapeHtml(shipment.sender_name || '—');
  const recipientName = escapeHtml(shipment.recipient_name || '—');
  const recipientPhone = escapeHtml(shipment.recipient_phone || '—');
  const senderPhone = escapeHtml(shipment.sender_phone || '—');
  const trackUrl = escapeHtml(getTrackUrl(shipment));
  const created = escapeHtml(
    shipment.created_at
      ? new Date(shipment.created_at).toLocaleString()
      : new Date().toLocaleString()
  );

  const qrBlock = qrDataUrl
    ? `<div class="qr-wrap"><img src="${qrDataUrl}" alt="Tracking QR code" /><div class="qr-label">Scan to track</div></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SmartTrack Ticket — ${tracking}</title>
  <style>${ticketStyles()}</style>
</head>
<body>
  <div class="wrap">
    <h1>SmartTrack Shipment Ticket</h1>
    <p class="sub">Generated ${created}</p>

    <div class="ticket">
      <div class="ticket-title">Parcel ticket — sender & receiver</div>
      <div class="tracking">${tracking}</div>
      ${qrBlock}

      <div class="party-grid">
        <div class="party-box">
          <div class="party-label">Sender</div>
          <div class="party-name">${senderName}</div>
          <div class="party-phone">${senderPhone}</div>
        </div>
        <div class="party-box">
          <div class="party-label">Receiver</div>
          <div class="party-name">${recipientName}</div>
          <div class="party-phone">${recipientPhone}</div>
        </div>
      </div>

      <div class="route">${origin} → ${dest}</div>
      <div class="row"><span class="label">Price</span><span class="value">${escapeHtml(price)}</span></div>
      <div class="row"><span class="label">Contents</span><span class="value">${contents}</span></div>
      ${trackUrl ? `<div class="url">Track online: ${trackUrl}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
}

export async function downloadShipmentTickets(shipment) {
  const trackUrl = getTrackUrl(shipment);
  const qrDataUrl = await getShipmentQrDataUrl(trackUrl);
  const html = await buildShipmentTicketsHtml(shipment, qrDataUrl);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `SmartTrack-${shipment.tracking_number}-ticket.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function printShipmentTickets(shipment) {
  const trackUrl = getTrackUrl(shipment);
  const qrDataUrl = await getShipmentQrDataUrl(trackUrl);
  const html = await buildShipmentTicketsHtml(shipment, qrDataUrl);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
  return true;
}

export async function publishShipmentTicket(shipment) {
  const url = getTrackUrl(shipment);
  const sender = shipment.sender_name || 'Sender';
  const receiver = shipment.recipient_name || 'Receiver';
  const text = `SmartTrack ${shipment.tracking_number}\nFrom: ${sender}\nTo: ${receiver}\nTrack: ${url}`;

  if (navigator.share) {
    await navigator.share({
      title: `SmartTrack ${shipment.tracking_number}`,
      text,
      url,
    });
    return 'shared';
  }

  await navigator.clipboard.writeText(text);
  return 'copied';
}

export function buildSmsBody(shipment) {
  const url = getTrackUrl(shipment);
  const sender = shipment.sender_name || 'Sender';
  const receiver = shipment.recipient_name || 'Receiver';
  const route = `${shipment.origin_location} → ${shipment.destination_location}`;
  return `SmartTrack ${shipment.tracking_number}\nFrom: ${sender}\nTo: ${receiver}\nRoute: ${route}\nTrack: ${url}`;
}

export function openSmsToPhone(phone, body) {
  if (!phone) return;
  const encoded = encodeURIComponent(body);
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  window.open(`sms:${cleaned}?body=${encoded}`, '_self');
}
