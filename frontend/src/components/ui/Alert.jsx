import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

const Alert = React.memo(({ children, type = 'info', onClose, title = '', className = '', role = 'alert' }) => {
  const types = {
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: '✓', bgIcon: 'bg-green-100', textIcon: 'text-green-600' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', icon: '✕', bgIcon: 'bg-red-100', textIcon: 'text-red-600' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', icon: '!', bgIcon: 'bg-yellow-100', textIcon: 'text-yellow-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'ℹ', bgIcon: 'bg-blue-100', textIcon: 'text-blue-600' },
  };

  const style = types[type];

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <div 
      className={`${style.bg} border ${style.border} rounded-lg p-4 ${style.text} ${className}`}
      role={role}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <div 
          className={`${style.bgIcon} ${style.textIcon} rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-sm`}
          aria-hidden="true"
        >
          {style.icon}
        </div>
        <div className="flex-1">
          {title && <h3 className="font-semibold mb-1">{title}</h3>}
          <p className="text-sm">{children}</p>
        </div>
        {onClose && (
          <button 
            onClick={handleClose} 
            className={`${style.textIcon} hover:opacity-70 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded`}
            aria-label={`Close ${type} alert`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
});

Alert.displayName = 'Alert';

Alert.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onClose: PropTypes.func,
  title: PropTypes.string,
  className: PropTypes.string,
  role: PropTypes.string,
};

export default Alert;
