import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Modal, Input, Button } from '../ui';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const INITIAL_FORM = {
  sender_name: '',
  recipient_name: '',
  origin_location: '',
  destination_location: '',
  recipient_phone: '',
  sender_phone: '',
  weight: '',
  dimensions: '',
  contents: '',
  status: 'pending',
  latitude: '',
  longitude: ''
};

const CreateShipmentModal = ({ isOpen, onClose, onCreated, onTicketReady }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [loadingTrackingId, setLoadingTrackingId] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copyHint, setCopyHint] = useState('');
  const { user } = useAuth();

  const fetchTrackingId = useCallback(async () => {
    setLoadingTrackingId(true);
    try {
      const data = await apiFetch('/api/shipments/tracking-id');
      setTrackingNumber(data.trackingNumber);
      setTrackingUrl(data.webUrl || '');
    } catch (err) {
      setError(err.message || 'Could not generate tracking ID');
    } finally {
      setLoadingTrackingId(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setCopyHint('');
      setForm({
        ...INITIAL_FORM,
        sender_name: user?.fullName || '',
        sender_phone: user?.phone || '',
      });
      fetchTrackingId();
    }
  }, [isOpen, fetchTrackingId, user?.phone, user?.fullName]);

  const updateField = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCopyTrackingId = async () => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopyHint('Copied!');
      setTimeout(() => setCopyHint(''), 2000);
    } catch {
      setCopyHint('Copy failed');
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setTrackingNumber('');
    setTrackingUrl('');
    setError('');
    setCopyHint('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trackingNumber) {
      setError('Tracking ID is required. Try refreshing the ID.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        tracking_number: trackingNumber,
        sender_name: form.sender_name.trim(),
        recipient_name: form.recipient_name.trim(),
        sender_phone: form.sender_phone.trim() || null,
        origin_location: form.origin_location,
        destination_location: form.destination_location,
        recipient_phone: form.recipient_phone.trim() || null,
        status: form.status,
        weight: form.weight ? parseFloat(form.weight) : null,
        dimensions: form.dimensions || null,
        contents: form.contents || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null
      };

      const shipment = await apiFetch('/api/shipments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const enriched = {
        ...shipment,
        sender_name: form.sender_name.trim() || shipment.sender_name,
        recipient_name: form.recipient_name.trim() || shipment.recipient_name,
        sender_phone: form.sender_phone.trim() || shipment.sender_phone || user?.phone,
        recipient_phone: form.recipient_phone.trim() || shipment.recipient_phone,
      };

      onCreated(enriched);
      if (onTicketReady) onTicketReady(enriched);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Shipment"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loadingTrackingId || !trackingNumber}>
            {submitting ? 'Creating...' : 'Create Shipment'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-[var(--tw-border)] bg-[var(--tw-surface2)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tw-muted)] mb-1">
                Tracking ID
              </p>
              <p className="text-lg font-bold font-mono text-[var(--tw-accent2)]">
                {loadingTrackingId ? 'Generating…' : trackingNumber || '—'}
              </p>
              {trackingUrl && (
                <p className="text-xs text-[var(--tw-muted)] mt-1 truncate">{trackingUrl}</p>
              )}
              <p className="text-xs text-[var(--tw-dim)] mt-2">
                Unique to your account — use on web and mobile tracking.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchTrackingId}
                disabled={loadingTrackingId}
              >
                New ID
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyTrackingId}
                disabled={!trackingNumber}
              >
                {copyHint || 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Sender name"
            value={form.sender_name}
            onChange={updateField('sender_name')}
            placeholder="John Sender"
            required
          />
          <Input
            label="Receiver name"
            value={form.recipient_name}
            onChange={updateField('recipient_name')}
            placeholder="Jane Receiver"
            required
          />
        </div>

        <Input
          label="Origin"
          value={form.origin_location}
          onChange={updateField('origin_location')}
          placeholder="Dar es Salaam, Tanzania"
          required
        />
        <Input
          label="Destination"
          value={form.destination_location}
          onChange={updateField('destination_location')}
          placeholder="Dodoma, Tanzania"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Recipient phone"
            type="tel"
            value={form.recipient_phone}
            onChange={updateField('recipient_phone')}
            placeholder="+255712345678"
            required
          />
          <Input
            label="Sender phone"
            type="tel"
            value={form.sender_phone}
            onChange={updateField('sender_phone')}
            placeholder="+255700000000"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Weight (kg)"
            type="number"
            step="0.1"
            value={form.weight}
            onChange={updateField('weight')}
            placeholder="12.5"
          />
          <Input
            label="Dimensions"
            value={form.dimensions}
            onChange={updateField('dimensions')}
            placeholder="40x30x20 cm"
          />
        </div>
        <Input
          label="Contents"
          value={form.contents}
          onChange={updateField('contents')}
          placeholder="Electronics, documents, etc."
        />
        <div>
          <label className="block text-sm font-semibold text-[var(--tw-text)] mb-2">Status</label>
          <select
            value={form.status}
            onChange={updateField('status')}
            className="w-full px-4 py-2.5 border border-[var(--tw-border2)] rounded-lg bg-[var(--tw-surface)] text-[var(--tw-text)] focus:outline-none focus:ring-2 focus:ring-[var(--tw-accent)]"
          >
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Latitude (optional)"
            type="number"
            step="any"
            value={form.latitude}
            onChange={updateField('latitude')}
            placeholder="-6.7924"
          />
          <Input
            label="Longitude (optional)"
            type="number"
            step="any"
            value={form.longitude}
            onChange={updateField('longitude')}
            placeholder="39.2083"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
};

CreateShipmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
  onTicketReady: PropTypes.func,
};

export default CreateShipmentModal;
