import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from '../ui';
import { apiFetch } from '../../services/api';
import {
  downloadShipmentTickets,
  printShipmentTickets,
  publishShipmentTicket,
  getTrackUrl,
  getShipmentQrDataUrl,
  calculateShipmentPrice,
  formatTsh,
  buildSmsBody,
  openSmsToPhone,
} from '../../utils/shipmentTicket';
import { assignGpsDevice, fetchDeviceAssignment } from '../../utils/gpsDevice';
import GpsDeviceAssignField from './GpsDeviceAssignField';

const ShipmentTicketModal = ({ shipment, onClose, onAssignmentChange }) => {
  const [publishHint, setPublishHint] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [gpsDeviceId, setGpsDeviceId] = useState('');
  const [assignedDeviceId, setAssignedDeviceId] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    if (!shipment) return;
    const url = getTrackUrl(shipment);
    getShipmentQrDataUrl(url).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    setAssignedDeviceId(shipment.assignedDeviceId || null);
    setGpsDeviceId(shipment.assignedDeviceId || '');
  }, [shipment]);

  useEffect(() => {
    if (!shipment?.id) return undefined;
    let cancelled = false;

    fetchDeviceAssignment(shipment.id)
      .then((result) => {
        if (cancelled) return;
        const deviceId = result?.data?.deviceId || null;
        setAssignedDeviceId(deviceId);
        setGpsDeviceId((current) => current || deviceId || '');
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [shipment?.id]);



  if (!shipment) return null;



  const trackUrl = getTrackUrl(shipment);

  const ticketData = { ...shipment, webUrl: trackUrl };

  const smsBody = buildSmsBody(ticketData);
  const priceLabel = formatTsh(calculateShipmentPrice(shipment.weight));



  const handleDownload = () => downloadShipmentTickets(ticketData);

  const handlePrint = async () => {

    const ok = await printShipmentTickets(ticketData);

    if (!ok) setPublishHint('Allow pop-ups to print the ticket');

  };



  const handlePublish = async () => {

    try {

      const result = await publishShipmentTicket(ticketData);

      setPublishHint(result === 'shared' ? 'Ticket published / shared!' : 'Ticket details copied');

      setTimeout(() => setPublishHint(''), 2500);

    } catch {

      setPublishHint('Could not publish — try Download instead');

    }

  };



  const handleAssignGps = async () => {
    const deviceId = gpsDeviceId.trim();
    if (!deviceId || !shipment?.tracking_number) {
      setPublishHint('Enter a GPS device ID (e.g. tracker-001)');
      setTimeout(() => setPublishHint(''), 3000);
      return;
    }

    setAssignLoading(true);
    setPublishHint('');
    try {
      const result = await assignGpsDevice({
        deviceId,
        trackingNumber: shipment.tracking_number,
      });
      const linked = result?.data?.deviceId || deviceId;
      setAssignedDeviceId(linked);
      setPublishHint(`GPS tracker ${linked} linked to this shipment`);
      onAssignmentChange?.({ ...shipment, assignedDeviceId: linked });
      setTimeout(() => setPublishHint(''), 4000);
    } catch (err) {
      setPublishHint(err.message || 'Could not assign GPS tracker');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSmsBoth = async () => {

    setSmsLoading(true);

    setPublishHint('');

    try {

      if (shipment.id) {

        const data = await apiFetch(`/api/shipments/${shipment.id}/send-sms`, { method: 'POST' });

        const sent = data.sms?.sent?.length || 0;

        const simulated = data.sms?.simulated;

        setPublishHint(

          sent > 0

            ? simulated

              ? `SMS logged for ${sent} number(s) (configure Twilio to send real texts)`

              : `SMS sent to ${sent} number(s)`

            : 'No valid phone numbers to send to'

        );

      } else {

        const phones = [shipment.sender_phone, shipment.recipient_phone].filter(Boolean);

        if (phones.length === 0) {

          setPublishHint('Add sender and recipient phone numbers');

        } else {

          phones.forEach((phone) => openSmsToPhone(phone, smsBody));

          setPublishHint(`Opened SMS for ${phones.length} number(s)`);

        }

      }

      setTimeout(() => setPublishHint(''), 4000);

    } catch (err) {

      setPublishHint(err.message || 'Could not send SMS');

    } finally {

      setSmsLoading(false);

    }

  };



  return (

    <Modal

      isOpen={Boolean(shipment)}

      onClose={onClose}

      title="Shipment ticket ready"

      size="lg"

      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button
            variant="outline"
            onClick={handleAssignGps}
            disabled={assignLoading || !gpsDeviceId.trim()}
          >
            {assignLoading ? 'Linking…' : 'Link GPS tracker'}
          </Button>
          <Button variant="outline" onClick={handleSmsBoth} disabled={smsLoading}>
            {smsLoading ? 'Sending…' : 'Send SMS'}
          </Button>
          <Button variant="outline" onClick={handlePrint}>Print</Button>
          <Button variant="outline" onClick={handleDownload}>Download</Button>
          <Button onClick={handlePublish}>Publish / Share</Button>
        </>
      }

    >

      <p className="text-sm text-[var(--tw-muted)] mb-4">

        QR code, sender & receiver phones, and tracking link. SMS goes to both numbers when you create a shipment.

      </p>



      <div className="rounded-xl border-2 border-[var(--tw-accent)] bg-[var(--tw-surface)] p-5">

        <p className="text-xs font-bold uppercase tracking-wide text-[var(--tw-accent2)] mb-2">

          Parcel ticket

        </p>

        <p className="font-mono text-2xl font-bold text-[var(--tw-text)] mb-4">

          {shipment.tracking_number}

        </p>



        {qrDataUrl && (

          <div className="flex flex-col items-center mb-4 p-4 rounded-lg bg-[var(--tw-surface2)] border border-[var(--tw-border)]">

            <img src={qrDataUrl} alt="Tracking QR code" className="w-40 h-40" />

            <p className="text-xs font-bold uppercase text-[var(--tw-muted)] mt-2">Scan to track</p>

          </div>

        )}



        <div className="grid gap-3 sm:grid-cols-2 mb-4">

          <div className="rounded-lg bg-[var(--tw-surface2)] border border-[var(--tw-border)] p-3">

            <p className="text-xs font-bold uppercase text-[var(--tw-muted)] mb-1">Sender</p>

            <p className="text-lg font-bold text-[var(--tw-text)]">{shipment.sender_name || '—'}</p>

            <p className="text-sm text-[var(--tw-accent2)] mt-1">{shipment.sender_phone || '—'}</p>

          </div>

          <div className="rounded-lg bg-[var(--tw-surface2)] border border-[var(--tw-border)] p-3">

            <p className="text-xs font-bold uppercase text-[var(--tw-muted)] mb-1">Receiver</p>

            <p className="text-lg font-bold text-[var(--tw-text)]">{shipment.recipient_name || '—'}</p>

            <p className="text-sm text-[var(--tw-accent2)] mt-1">{shipment.recipient_phone || '—'}</p>

          </div>

        </div>



        <p className="text-sm font-semibold text-[var(--tw-text)] mb-2">

          {shipment.origin_location} → {shipment.destination_location}

        </p>

        <div className="rounded-lg bg-[var(--tw-surface2)] border border-[var(--tw-border)] p-3 mb-3">
          <p className="text-xs font-bold uppercase text-[var(--tw-muted)] mb-2">Price</p>
          <p className="text-lg font-bold text-[var(--tw-text)]">{priceLabel}</p>
        </div>

        <div className="text-xs text-[var(--tw-muted)] space-y-1">
          <p>Contents: {shipment.contents || '—'}</p>

        </div>

        <GpsDeviceAssignField
          value={gpsDeviceId}
          onChange={(e) => setGpsDeviceId(e.target.value)}
          assignedDeviceId={assignedDeviceId}
          disabled={assignLoading}
          hint="Link the ESP before it sends GPS, or use Link GPS tracker below."
        />

      </div>



      <p className="text-xs text-[var(--tw-muted)] mt-4 break-all">{trackUrl}</p>

      {publishHint && <p className="text-sm text-[var(--tw-accent2)] mt-2 font-medium">{publishHint}</p>}

    </Modal>

  );

};



ShipmentTicketModal.propTypes = {
  shipment: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onAssignmentChange: PropTypes.func,
};



export default ShipmentTicketModal;

