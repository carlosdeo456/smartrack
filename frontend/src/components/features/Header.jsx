import React from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = ({ title = 'SmartTrack', subtitle = 'Real-time Parcel Tracking' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <Link to="/" className="logo">
        <div className="logo-icon">🚚</div>
        <div>
          <div>{title}</div>
          <div className="logo-sub">{subtitle.toUpperCase()}</div>
        </div>
      </Link>

      <nav className="topbar-nav hidden md:flex">
        <Link to="/" className={`topbar-nav-link ${isDashboard ? 'active' : ''}`}>
          Dashboard
        </Link>
        <Link to="/map" className={`topbar-nav-link ${location.pathname === '/map' ? 'active' : ''}`}>
          Live Map
        </Link>
        <Link to="/track" className={`topbar-nav-link ${location.pathname.startsWith('/track') ? 'active' : ''}`}>
          Track
        </Link>
      </nav>

      <div className="topbar-right">
        <Link to="/track" className="icon-btn" title="Track parcel">
          <i className="fas fa-search" />
        </Link>
        <Link to="/map" className="icon-btn" title="Live Map">
          <i className="fas fa-map-marked-alt" />
        </Link>
        {user && (
          <div className="topbar-user">
            <span className="topbar-user-name">{user.fullName}</span>
            <span className="topbar-user-role">{user.role}</span>
          </div>
        )}
        <button type="button" className="icon-btn" title="Logout" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" />
        </button>
      </div>
    </header>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

export default Header;
