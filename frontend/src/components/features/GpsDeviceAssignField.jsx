import React from 'react';
import PropTypes from 'prop-types';
import { Input } from '../ui';

const GpsDeviceAssignField = ({
  value,
  onChange,
  assignedDeviceId,
  disabled = false,
  hint,
}) => (
  <div className="rounded-lg border border-[var(--tw-border)] bg-[var(--tw-surface2)] p-4 space-y-2">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tw-muted)]">
        GPS tracker device
      </p>
      <p className="text-xs text-[var(--tw-dim)] mt-1">
        Link an ESP tracker (e.g. tracker-001) so live GPS posts to this shipment.
      </p>
    </div>
    <Input
      label="Device ID"
      value={value}
      onChange={onChange}
      placeholder="tracker-001"
      disabled={disabled}
      autoComplete="off"
    />
    {assignedDeviceId && assignedDeviceId !== value.trim() && (
      <p className="text-xs text-emerald-700">
        Currently assigned: <span className="font-mono font-semibold">{assignedDeviceId}</span>
      </p>
    )}
    {hint && <p className="text-xs text-[var(--tw-muted)]">{hint}</p>}
  </div>
);

GpsDeviceAssignField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  assignedDeviceId: PropTypes.string,
  disabled: PropTypes.bool,
  hint: PropTypes.string,
};

export default GpsDeviceAssignField;
