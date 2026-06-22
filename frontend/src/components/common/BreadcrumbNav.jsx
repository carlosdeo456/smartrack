import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

const BreadcrumbNav = ({ custom = [] }) => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    ...custom,
  ];

  pathSegments.forEach((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = decodeURIComponent(segment)
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (!breadcrumbs.some(b => b.path === path)) {
      breadcrumbs.push({ label, path });
    }
  });

  return (
    <nav className="flex items-center space-x-2 text-sm text-[var(--tw-muted)] px-6 py-3 bg-[var(--tw-surface2)] border-b border-[var(--tw-border)]">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center">
          {index > 0 && <span className="mx-2 text-[var(--tw-dim)]">/</span>}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-[var(--tw-text)] font-medium">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-[var(--tw-accent)] hover:opacity-80 hover:underline transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};

BreadcrumbNav.propTypes = {
  custom: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
    })
  ),
};

export default BreadcrumbNav;
