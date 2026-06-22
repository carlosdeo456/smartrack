import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ className = '', variant = 'default' }) => {
  const { isDark, setTheme } = useTheme();

  if (variant === 'dashboard') {
    return (
      <div className={`theme-switch ${className}`}>
        <button
          type="button"
          className={`theme-switch-btn ${!isDark ? 'active' : ''}`}
          onClick={() => setTheme('light')}
          aria-pressed={!isDark}
        >
          <i className="fas fa-sun" />
          Light
        </button>
        <button
          type="button"
          className={`theme-switch-btn ${isDark ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
          aria-pressed={isDark}
        >
          <i className="fas fa-moon" />
          Dark
        </button>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={`icon-btn theme-toggle-icon ${className}`}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors
        border-[var(--tw-border2)] bg-[var(--tw-surface)] text-[var(--tw-muted)] hover:bg-[var(--tw-surface2)]
        ${className}`}
    >
      <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} />
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
};

ThemeToggle.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'icon', 'dashboard']),
};

export default ThemeToggle;
