import React, { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { isEscapeKey, createFocusTrap } from '../../utils/a11y';

const Modal = React.memo(({ isOpen, onClose, title, children, footer, size = 'md', className = '' }) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        if (modalRef.current) {
          const closeBtn = modalRef.current.querySelector('[aria-label="Close modal"]');
          if (closeBtn) closeBtn.focus();
        }
      }, 0);

      if (modalRef.current) {
        const removeTrap = createFocusTrap(modalRef.current);
        return () => {
          removeTrap();
        };
      }
    } else {
      document.body.style.overflow = 'unset';
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleKeyDown = useCallback((e) => {
    if (isEscapeKey(e)) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`bg-[var(--tw-surface)] text-[var(--tw-text)] rounded-xl shadow-card dark:shadow-card-dark border border-[var(--tw-border)] ${sizes[size]} w-full ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={handleKeyDown}
      >
        {title && (
          <div className="border-b border-[var(--tw-border)] px-6 py-4 flex justify-between items-center">
            <h2 id="modal-title" className="text-lg font-bold text-[var(--tw-text)]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[var(--tw-muted)] hover:text-[var(--tw-text)] text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-[var(--tw-border)] px-6 py-4 bg-[var(--tw-surface2)] rounded-b-xl flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

export default Modal;
