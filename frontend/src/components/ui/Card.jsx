import React from 'react';
import PropTypes from 'prop-types';

const Card = React.memo(({ children, className = '', header, footer, hover = false }) => {
  return (
    <div className={`bg-[var(--tw-surface)] text-[var(--tw-text)] rounded-xl shadow-card dark:shadow-card-dark border border-[var(--tw-border)] transition-all duration-200 ${hover ? 'hover:shadow-lg hover:-translate-y-0.5' : ''} ${className}`} role="article">
      {header && (
        <div className="border-b border-[var(--tw-border)] px-6 py-4">
          {typeof header === 'string' ? (
            <h2 className="text-lg font-bold text-[var(--tw-text)]">{header}</h2>
          ) : (
            header
          )}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="border-t border-[var(--tw-border)] px-6 py-4 bg-[var(--tw-surface2)] rounded-b-xl" role="contentinfo">{footer}</div>
      )}
    </div>
  );
});

Card.displayName = 'Card';

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  header: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  footer: PropTypes.node,
  hover: PropTypes.bool,
};

export default Card;
