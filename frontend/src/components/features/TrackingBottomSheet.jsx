import React, { useRef, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

const SNAP = { collapsed: 22, default: 33, expanded: 55 };

function getStepState(status) {
  if (status === 'delivered') return { active: 2, completed: [0, 1, 2] };
  if (status === 'in_transit') return { active: 1, completed: [0] };
  return { active: 0, completed: [] };
}

function estimateEtaMinutes(shipment, routeProgress) {
  if (shipment?.status === 'delivered') return 0;
  if (shipment?.expected_delivery) {
    const mins = Math.round((new Date(shipment.expected_delivery) - Date.now()) / 60000);
    return Math.max(1, mins);
  }
  const remaining = Math.max(0, 100 - routeProgress);
  return Math.max(1, Math.round((remaining / 100) * 20));
}

function getInitials(name) {
  if (!name) return 'C';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const STEPS = [
  { key: 'picked_up', label: 'Picked up' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' }
];

const TrackingBottomSheet = ({
  shipment,
  routeProgress = 0,
  isTracking = false,
  connected = false,
  liveFlash = false
}) => {
  const [heightVh, setHeightVh] = useState(SNAP.default);
  const dragRef = useRef({ startY: 0, startHeight: SNAP.default, dragging: false });

  const stepState = getStepState(shipment?.status);
  const etaMinutes = estimateEtaMinutes(shipment, routeProgress);
  const courierName = shipment?.driver_name || 'Your courier';
  const courierPhone = shipment?.driver_phone;

  const snapToNearest = useCallback((h) => {
    const distances = Object.values(SNAP).map(s => ({ s, d: Math.abs(h - s) }));
    distances.sort((a, b) => a.d - b.d);
    setHeightVh(distances[0].s);
  }, []);

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startHeight: heightVh,
      dragging: true
    };
  }, [heightVh]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    const deltaY = dragRef.current.startY - e.clientY;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    const next = Math.min(SNAP.expanded + 5, Math.max(SNAP.collapsed - 5, dragRef.current.startHeight + deltaVh));
    setHeightVh(next);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    snapToNearest(heightVh);
  }, [heightVh, snapToNearest]);

  useEffect(() => {
    const onResize = () => snapToNearest(heightVh);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [heightVh, snapToNearest]);

  const headline = shipment?.status === 'delivered'
    ? 'Delivered'
    : isTracking
      ? `Arriving in ${etaMinutes} min`
      : `Estimated ${etaMinutes} min`;

  return (
    <div
      className={`tracking-bottom-sheet ${liveFlash ? 'tracking-bottom-sheet--flash' : ''}`}
      style={{ height: `${heightVh}vh` }}
    >
      <div
        className="tracking-sheet-handle-zone"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="Resize tracking panel"
        aria-valuenow={heightVh}
      >
        <div className="tracking-sheet-handle" />
      </div>

      <div className="tracking-sheet-body">
        <div className="tracking-sheet-header">
          <h2 className="tracking-sheet-eta">{headline}</h2>
          {isTracking && (
            <span className={`tracking-live-pill ${connected ? '' : 'tracking-live-pill--offline'}`}>
              <span className="tracking-live-dot" />
              {connected ? 'Live' : 'Reconnecting'}
            </span>
          )}
        </div>

        <div className="tracking-progress-track">
          <div
            className="tracking-progress-fill"
            style={{ width: `${routeProgress}%` }}
          />
        </div>

        {(shipment?.sender_name || shipment?.recipient_name) && (
          <div className="tracking-party-grid">
            <div className="tracking-party">
              <div className="tracking-party-label">Sender</div>
              <div className="tracking-party-name">{shipment.sender_name || '—'}</div>
            </div>
            <div className="tracking-party">
              <div className="tracking-party-label">Receiver</div>
              <div className="tracking-party-name">{shipment.recipient_name || '—'}</div>
            </div>
          </div>
        )}

        <div className="tracking-steps">
          {STEPS.map((step, i) => {
            const isCompleted = stepState.completed.includes(i);
            const isActive = stepState.active === i;
            return (
              <div
                key={step.key}
                className={`tracking-step ${isCompleted ? 'tracking-step--done' : ''} ${isActive ? 'tracking-step--active' : ''}`}
              >
                <div className="tracking-step-dot">
                  {isCompleted ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </div>
                <span className="tracking-step-label">{step.label}</span>
              </div>
            );
          })}
        </div>

        <div className="tracking-courier-card">
          <div className="tracking-courier-avatar" aria-hidden="true">
            {getInitials(courierName)}
          </div>
          <div className="tracking-courier-info">
            <p className="tracking-courier-name">{courierName}</p>
            <p className="tracking-courier-rating">
              <span className="tracking-stars" aria-label="4.9 out of 5 stars">★★★★★</span>
              <span className="tracking-rating-value">4.9</span>
            </p>
          </div>
          <div className="tracking-courier-actions">
            <a
              href={courierPhone ? `tel:${courierPhone}` : undefined}
              className={`tracking-action-btn tracking-action-btn--call ${!courierPhone ? 'tracking-action-btn--disabled' : ''}`}
              aria-label="Call courier"
              onClick={!courierPhone ? (e) => e.preventDefault() : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </a>
            <a
              href={courierPhone ? `sms:${courierPhone}` : undefined}
              className={`tracking-action-btn tracking-action-btn--message ${!courierPhone ? 'tracking-action-btn--disabled' : ''}`}
              aria-label="Message courier"
              onClick={!courierPhone ? (e) => e.preventDefault() : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </a>
          </div>
        </div>

        <p className="tracking-destination">
          To <strong>{shipment?.destination_location}</strong>
          {shipment?.tracking_number && (
            <span className="tracking-number"> · {shipment.tracking_number}</span>
          )}
        </p>
      </div>
    </div>
  );
};

TrackingBottomSheet.propTypes = {
  shipment: PropTypes.object,
  routeProgress: PropTypes.number,
  isTracking: PropTypes.bool,
  connected: PropTypes.bool,
  liveFlash: PropTypes.bool
};

export default TrackingBottomSheet;
