import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';
import '../Styles/CampusSupport.css';

// Calls OUR server, which calls StrathShop. No partner URL or key lives here.
const UNAVAILABLE =
  'Campus support services are unavailable right now. Please try again in a few minutes.';

const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// Never throws: always resolves to { services, error }.
const fetchServices = async () => {
  try {
    const res = await apiFetch('partner/counseling');
    if (!res.ok) return { services: [], error: UNAVAILABLE };
    const data = await res.json();
    return { services: Array.isArray(data) ? data : [], error: '' };
  } catch {
    return { services: [], error: UNAVAILABLE };
  }
};

const emptyBooking = { date: '', time: '', reason: '' };

const CampusSupport = () => {
  // --- StrathShop counseling services ---
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');

  // --- Our doctors (for booking) ---
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);

  // --- Booking modal ---
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState(emptyBooking);
  const [formError, setFormError] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError('');
    const result = await fetchServices();
    setServices(result.services);
    setServicesError(result.error);
    setServicesLoading(false);
  }, []);

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    setDoctorsError('');
    setNeedsLogin(false);
    try {
      const res = await apiFetch('doctors');
      if (res.status === 401) {
        setNeedsLogin(true);
        setDoctors([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to load doctors');
      const data = await res.json();
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      setDoctorsError(err.message);
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
    loadDoctors();
  }, [loadServices, loadDoctors]);

  const openBooking = (doctor) => {
    setSelectedDoctor(doctor);
    setFormData(emptyBooking);
    setFormError('');
    setBooked(null);
  };

  const closeBooking = () => {
    if (booking) return;
    setSelectedDoctor(null);
    setBooked(null);
    setFormError('');
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.date || !formData.time) {
      setFormError('Please choose a date and time.');
      return;
    }

    setBooking(true);
    try {
      const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();
      const res = await apiFetch('appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          scheduledAt,
          reason: formData.reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment');
      setBooked(data);
      setFormData(emptyBooking);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBooking(false);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="support-container">
      {/* ── 1. Counseling services (StrathShop, proxied) ── */}
      <h2>Campus Support Services</h2>
      <p className="support-intro">
        Counseling and health services offered on campus, provided by StrathShop.
      </p>

      {servicesLoading && <p className="support-note">Loading services…</p>}

      {!servicesLoading && servicesError && (
        <div className="support-error" role="alert">
          <p>{servicesError}</p>
          <button type="button" className="support-retry" onClick={loadServices}>
            Try again
          </button>
        </div>
      )}

      {!servicesLoading && !servicesError && services.length === 0 && (
        <p className="support-note">No services are listed at the moment.</p>
      )}

      {!servicesLoading && !servicesError && services.length > 0 && (
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

      {/* ── 2. Doctors (our API) — book an appointment ── */}
      <h2 className="support-section-title">Book an Appointment</h2>
      <p className="support-intro">
        Choose a doctor and pick a time. Your booking will appear on your dashboard.
      </p>

      {doctorsLoading && <p className="support-note">Loading doctors…</p>}

      {!doctorsLoading && needsLogin && (
        <div className="support-error" role="alert">
          <p>Please <a href="/login">log in</a> to book an appointment with a doctor.</p>
        </div>
      )}

      {!doctorsLoading && !needsLogin && doctorsError && (
        <div className="support-error" role="alert">
          <p>{doctorsError}</p>
          <button type="button" className="support-retry" onClick={loadDoctors}>
            Try again
          </button>
        </div>
      )}

      {!doctorsLoading && !needsLogin && !doctorsError && doctors.length === 0 && (
        <p className="support-note">No doctors are available right now.</p>
      )}

      {!doctorsLoading && !needsLogin && !doctorsError && doctors.length > 0 && (
        <div className="support-grid">
          {doctors.map((doc) => (
            <article key={doc.id} className="support-card">
              <div className="support-card-head">
                <h3>{doc.name}</h3>
              </div>
              <p className="support-provider">{doc.specialization}</p>
              <p className="support-desc"><strong>License:</strong> {doc.licenseNumber}</p>
              <p className="support-desc"><strong>Email:</strong> {doc.email}</p>
              <button
                type="button"
                className="support-retry"
                onClick={() => openBooking(doc)}
              >
                Book appointment
              </button>
            </article>
          ))}
        </div>
      )}

      {/* ── 3. Booking modal ── */}
      {selectedDoctor && (
        <div className="support-modal-overlay" onClick={closeBooking}>
          <div className="support-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Book with {selectedDoctor.name}</h3>
            <p className="support-note">{selectedDoctor.specialization}</p>

            {booked && (
              <div className="support-note" role="status">
                ✅ Appointment booked for{' '}
                {new Date(booked.scheduledAt).toLocaleString()}. View it on your{' '}
                <a href="/dashboard">dashboard</a>.
              </div>
            )}

            {formError && (
              <div className="support-error" role="alert"><p>{formError}</p></div>
            )}

            {!booked && (
              <form onSubmit={handleBook}>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    min={todayISO}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Reason for visit</label>
                  <textarea
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
                <div className="support-modal-actions">
                  <button type="submit" className="btn btn-success" disabled={booking}>
                    {booking ? 'Booking…' : 'Confirm booking'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeBooking}
                    disabled={booking}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {booked && (
              <div className="support-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeBooking}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusSupport;