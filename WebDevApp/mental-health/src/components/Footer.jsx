import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../Styles/Footer.css';

function Footer() {
  const { user, logout } = useAuth();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/features', label: 'Features' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/events', label: 'Events' },
    { to: '/donate', label: 'Donate' },
    { to: '/contact', label: 'Contact' },
  ];

  if (user) {
    navLinks.push({ to: '/dashboard', label: 'Dashboard' });
    navLinks.push({ to: '#', label: 'Logout', onClick: logout });
  } else {
    navLinks.push({ to: '/login', label: 'Login' });
  }

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">Strathmore <span>Mental Health</span></div>
          <p>A safe, anonymous space for Strathmore University students to find support, build resilience, and never face hard days alone.</p>
          <div className="strathmore-tag">Strathmore University · Nairobi</div>
        </div>

        <div className="footer-links">
          <h4>Navigate</h4>
          <ul>
            {navLinks.map(({ to, label, onClick }) => (
              <li key={label}>
                {onClick ? (
                  <a href="#" onClick={(e) => { e.preventDefault(); onClick(); }}>
                    {label}
                  </a>
                ) : (
                  <NavLink to={to}>{label}</NavLink>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-links">
          <h4>Support</h4>
          <ul>
            <li><a href="tel:+254722000000">Crisis Line: 0722 000 000</a></li>
            <li><a href="mailto:wellness@strathmore.edu">wellness@strathmore.edu</a></li>
            <li><span>Student Welfare Office, Block C</span></li>
            <li><span>Mon – Fri, 8am – 5pm</span></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Strathmore University Mental Health · <em>"Ut omnes unum sint"</em></p>
      </div>
    </footer>
  );
}

export default Footer;