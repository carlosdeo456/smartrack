import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const Toast = ({
  message,
  type = 'info',
  onClose,
  duration = 3000,
  autoClose = true,
  actions = [],
  onAction = () => {},
  count = 1,
}) => {
  useEffect(() => {
    if (autoClose && duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, autoClose, onClose]);

  const types = {
    success: { bg: 'bg-green-500', icon: '✓' },
    error: { bg: 'bg-red-500', icon: '✕' },
    warning: { bg: 'bg-yellow-500', icon: '!' },
    info: { bg: 'bg-blue-500', icon: 'ℹ' },
  };

  const style = types[type];

  return (
    <div className={`${style.bg} text-white px-4 py-3 rounded-lg shadow-lg animate-slideIn`}>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold">{style.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span>{message}</span>
            {count > 1 && <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded">+{count}</span>}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:opacity-80 text-lg leading-none"
          aria-label="Close toast"
        >
          ×
        </button>
      </div>

      {actions && actions.length > 0 && (
        <div className="mt-3 flex gap-2 ml-8">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="text-sm px-3 py-1 rounded bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors font-medium"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onClose: PropTypes.func.isRequired,
  duration: PropTypes.number,
  autoClose: PropTypes.bool,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  onAction: PropTypes.func,
  count: PropTypes.number,
};

export default Toast;
