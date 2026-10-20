import { useState, useEffect } from 'react';
import '../Styles/CampusSupport.css';

// Calls OUR server, which calls StrathShop. No partner URL or key lives here.
const API_BASE = 'http://localhost:3000/api';

const UNAVAILABLE =
  'Campus support services are unavailable right now. Please try again in a few minutes.';

// The partner returns lowercase values; capitalising for display is our job.
const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// Never throws: always resolves to { services, error }.
const fetchServices = async () => {
  try {
    const res = await fetch(`${API_BASE}/partner/counseling`);
    if (!res.ok) return { services: [], error: UNAVAILABLE };
    return { services: await res.json(), error: '' };
  } catch {
    // our own server is unreachable
    return { services: [], error: UNAVAILABLE };
  }
};

const CampusSupport = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apply = (result) => {
    setServices(result.services);
    setError(result.error);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    fetchServices().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const retry = () => {
    setLoading(true);
    setError('');
    fetchServices().then(apply);
  };

  return (
    <div className="support-container">
      <h2>Campus Support Services</h2>
      <p className="support-intro">
        Counseling and health services offered on campus, provided by StrathShop.
      </p>

      {loading && <p className="support-note">Loading services…</p>}

      {!loading && error && (
        <div className="support-error" role="alert">
          <p>{error}</p>
          <button type="button" className="support-retry" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <p className="support-note">No services are listed at the moment.</p>
      )}

      {!loading && !error && services.length > 0 && (
        <div className="support-grid">
          {services.map((s) => (
            <article key={s.id} className="support-card">
              <div className="support-card-head">
                <h3>{s.title}</h3>
                <span className={`support-status support-status-${s.status}`}>
                  {capitalise(s.status)}
                </span>
              </div>
              <p className="support-provider">{s.providerName}</p>
              {s.description && <p className="support-desc">{s.description}</p>}
              <p className="support-price">KES {Number(s.price).toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampusSupport;
