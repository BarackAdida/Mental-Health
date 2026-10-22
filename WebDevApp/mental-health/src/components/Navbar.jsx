import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../Styles/Navbar.css';

function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const baseLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/features', label: 'Features' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/events', label: 'Events' },
    { to: '/campus-support', label: 'Campus Support' },
    { to: '/donate', label: 'Donate' },
  ];

  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-logo" onClick={() => setOpen(false)}>
        Strathmore <span>Mental Health</span>
      </NavLink>

      <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
        <span className={open ? 'bar open' : 'bar'}></span>
        <span className={open ? 'bar open' : 'bar'}></span>
        <span className={open ? 'bar open' : 'bar'}></span>
      </button>

      <ul className={`nav-links ${open ? 'nav-open' : ''}`}>
        {baseLinks.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          </li>
        ))}

        {/* Dynamic Auth Links */}
        {user ? (
          <>
            <li>
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
                onClick={() => setOpen(false)}
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <button 
                onClick={() => { logout(); setOpen(false); }} 
                className="nav-item" 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Logout
              </button>
            </li>
          </>
        ) : (
          <li>
            <NavLink 
              to="/login" 
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} 
              onClick={() => setOpen(false)}
            >
              Login
            </NavLink>
          </li>
        )}

        <li>
          <NavLink to="/contact" className="nav-cta" onClick={() => setOpen(false)}>
            Get Support
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;