import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';
import '../Styles/CampusSupport.css';

const UNAVAILABLE = 'Services unavailable right now.';
const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const fetchServices = async () => {
  try {
    const res = await apiFetch('partner/counseling');
    if (!res.ok) {
      return { services: [], stale: false, asOf: null, error: UNAVAILABLE };
    }
    const body = await res.json();
    // Resilient partner returns { data, stale, asOf }.
    // Tolerate a bare array too, in case we ever hit an older build.
    if (Array.isArray(body)) {
      return { services: body, stale: false, asOf: null, error: '' };
    }
    const { data, stale, asOf } = body || {};
    if (!Array.isArray(data)) {
      return { services: [], stale: false, asOf: null, error: UNAVAILABLE };
    }
    return { services: data, stale: Boolean(stale), asOf: asOf || null, error: '' };
  } catch {
    return { services: [], stale: false, asOf: null, error: UNAVAILABLE };
  }
};

const emptyBooking = { date: '', time: '', reason: '' };

const CampusSupport = () => {
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [servicesStale, setServicesStale] = useState(false);
  const [servicesAsOf, setServicesAsOf] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(emptyBooking);
  const [formError, setFormError] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchServices();
      setServices(result.services);
      setServicesError(result.error);
      setServicesStale(result.stale);
      setServicesAsOf(result.asOf);
      setServicesLoading(false);

      const res = await apiFetch('doctors');
      if (res.status === 401) {
        setNeedsLogin(true);
        setDoctors([]);
      } else if (res.ok) {
        setDoctors(await res.json());
      }
    } catch {
      // Ignore doctor fetch errors
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetry = () => {
    setServicesLoading(true);
    setDoctorsLoading(true);
    setServicesError('');
    setServicesStale(false);
    setServicesAsOf(null);
    setNeedsLogin(false);
    loadData();
  };

  const openBooking = (type, data) => {
    if (needsLogin) return alert('Please log in to book.');
    setSelectedItem({ type, data });
    setFormData(emptyBooking);
    setFormError('');
    setBooked(null);
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.time) return setFormError('Choose a date and time.');
    setBooking(true);
    try {
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

      const payload = {
        type: selectedItem.type,
        scheduledAt,
        reason: formData.reason,
      };

      if (selectedItem.type === 'doctor') {
        payload.doctorId = selectedItem.data.id;
      } else {
        payload.serviceName = selectedItem.data.title;
        payload.providerName = selectedItem.data.providerName;
      }

      const res = await apiFetch('appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to book');
      setBooked(data);
      setFormData(emptyBooking);
    } catch (err) { setFormError(err.message); } finally { setBooking(false); }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="support-container">
      <h2>Campus Support Services</h2>
      <p className="support-intro">Counseling and health services offered on campus, provided by StrathShop.</p>

      {servicesLoading && <p className="support-note">Loading services…</p>}

      {!servicesLoading && servicesStale && servicesAsOf && (
        <div className="support-stale-banner" role="status">
          <strong>Showing saved data</strong> from{' '}
          {new Date(servicesAsOf).toLocaleTimeString()}. The partner is not responding —
          this is not live.
        </div>
      )}

      {!servicesLoading && servicesError && (
        <div className="support-error">
          <p>{servicesError}</p>
          <button onClick={handleRetry}>Try again</button>
        </div>
      )}

      {!servicesLoading && !servicesError && (
        <div className="support-grid">
          {services.map((s) => (
            <article key={s.id} className="support-card">
              <div className="support-card-head">
                <h3>{s.title}</h3>
                <span className={`support-status support-status-${s.status}`}>{capitalise(s.status)}</span>
              </div>
              <p className="support-provider">{s.providerName}</p>
              {s.description && <p className="support-desc">{s.description}</p>}
              <p className="support-price">KES {Number(s.price).toLocaleString()}</p>
              <button type="button" className="support-retry" onClick={() => openBooking('service', s)}>Book Service</button>
            </article>
          ))}
        </div>
      )}

      <h2 className="support-section-title">Book an Appointment</h2>
      <p className="support-intro">Choose a doctor and pick a time.</p>

      {doctorsLoading && <p className="support-note">Loading doctors…</p>}
      {!doctorsLoading && needsLogin && <div className="support-error"><p>Please <a href="/login">log in</a> to book.</p></div>}

      {!doctorsLoading && !needsLogin && (
        <div className="support-grid">
          {doctors.map((doc) => (
            <article key={doc.id} className="support-card">
              <div className="support-card-head"><h3>{doc.name}</h3></div>
              <p className="support-provider">{doc.specialization}</p>
              <p className="support-desc"><strong>License:</strong> {doc.licenseNumber}</p>
              <button type="button" className="support-retry" onClick={() => openBooking('doctor', doc)}>Book Appointment</button>
            </article>
          ))}
        </div>
      )}

      {selectedItem && (
        <div className="support-modal-overlay" onClick={() => !booking && setSelectedItem(null)}>
          <div className="support-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Book {selectedItem.type === 'doctor' ? selectedItem.data.name : selectedItem.data.title}</h3>

            {booked ? (
              <div className="support-note" role="status">
                ✅ Booked for {new Date(booked.scheduledAt).toLocaleString()}. <br/>
                View it on your <a href="/dashboard">dashboard</a>.
                <div className="support-modal-actions mt-1">
                  <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBook}>
                {formError && <div className="support-error"><p>{formError}</p></div>}
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" min={todayISO} value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Reason (Optional)</label>
                  <textarea rows="2" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                </div>
                <div className="support-modal-actions">
                  <button type="submit" className="btn btn-success" disabled={booking}>{booking ? 'Booking…' : 'Confirm'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)} disabled={booking}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusSupport;