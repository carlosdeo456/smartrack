import React from 'react';
import PropTypes from 'prop-types';

const Input = ({ label, type = 'text', placeholder, value, onChange, error, disabled = false, className = '', icon, ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-semibold text-[var(--tw-text)] mb-2">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--tw-muted)]">{icon}</div>}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full px-4 py-2.5 ${icon ? 'pl-10' : ''} border rounded-lg bg-[var(--tw-surface)] text-[var(--tw-text)] placeholder:text-[var(--tw-dim)] transition-colors ${error ? 'border-red-500 focus:ring-red-500' : 'border-[var(--tw-border2)] focus:ring-[var(--tw-accent)]'} focus:outline-none focus:ring-2 disabled:bg-[var(--tw-surface2)] disabled:cursor-not-allowed ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
};

Input.propTypes = {
  label: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  icon: PropTypes.node,
};

export default Input;
