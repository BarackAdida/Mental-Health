import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../Styles/Navbar.css';

function Navbar() {
  const [open, setOpen] = useState(false);

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
        {[
          { to: '/',          label: 'Home' },
          { to: '/about',     label: 'About' },
          { to: '/features',  label: 'Features' },
          { to: '/how-it-works', label: 'How It Works' },
          { to: '/events',    label: 'Events' },
          { to: '/donate',    label: 'Donate' },
          { to: '/login',   label: 'Login' },
        ].map(({ to, label }) => (
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
