import React from 'react';
import PropTypes from 'prop-types';

const Badge = React.memo(({ children, variant = 'default', size = 'md', className = '', ariaLabel = null }) => {
  const variants = {
    default: 'bg-gray-200 text-gray-900',
    primary: 'bg-primary-100 text-primary-700 dark:bg-[var(--tw-accent-muted)] dark:text-[var(--tw-accent2)]',
    success: 'bg-green-100 text-green-900',
    warning: 'bg-yellow-100 text-yellow-900',
    danger: 'bg-red-100 text-red-900',
    info: 'bg-cyan-100 text-cyan-900',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span 
      className={`inline-block font-semibold rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
      role="status"
      aria-label={ariaLabel}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger', 'info']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default Badge;
