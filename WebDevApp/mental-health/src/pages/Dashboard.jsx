import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../config/api';
import '../Styles/Dashboard.css';

const formatEventDate = (event) => {
  const raw = event.startTime || event.start_time || event.date;
  if (!raw) return 'TBA';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [savedEvents, setSavedEvents] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apptError, setApptError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const userRes = await apiFetch('auth/me');
      if (!userRes.ok) {
        if (userRes.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch user');
      }
      setUser(await userRes.json());

      const [eventsRes, apptRes] = await Promise.all([
        apiFetch('events/saved'),
        apiFetch('appointments'),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setSavedEvents(Array.isArray(data) ? data : []);
      }

      if (apptRes.ok) {
        const data = await apptRes.json();
        setAppointments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    loadDashboard();
  };

  const handleLogout = async () => {
    try {
      const res = await apiFetch('auth/logout', { method: 'POST' });
      if (res.ok) navigate('/login');
      else alert('Logout failed');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnsave = async (eventId) => {
    if (!window.confirm('Remove this event from your saved list?')) return;
    try {
      const res = await apiFetch(`events/${eventId}/save`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to unsave');
      setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setApptError('');
    try {
      const res = await apiFetch(`appointments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel appointment');
      }
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setApptError(err.message);
    }
  };

  if (loading) return <div className="dashboard-loading">Loading your dashboard...</div>;
  
  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleRetry}>
          Try again
        </button>
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <div className="dashboard-container">
      <div className="user-profile-card">
        <div className="user-avatar">👤</div>
        <div className="user-info">
          <h2>{user.name}</h2>
          <p className="user-email">{user.email}</p>
          <span className={`user-role ${user.is_admin ? 'role-admin' : 'role-user'}`}>
            {user.is_admin ? 'Admin' : 'User'}
          </span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="dashboard-header">
        <h1>Your Appointments</h1>
        <p className="dashboard-subtitle">
          Bookings you've made with campus doctors.
        </p>
      </div>

      <div className="dashboard-actions">
        <Link to="/campus-support" className="btn btn-primary">
          Book an Appointment
        </Link>
      </div>

      {apptError && (
        <div className="appt-error" role="alert">
          {apptError}
        </div>
      )}

      <div className="appointments-list">
        {appointments.length === 0 ? (
          <div className="empty-state">
            <p>You haven't booked any appointments yet.</p>
            <Link to="/campus-support" className="btn btn-secondary">
              Browse Doctors
            </Link>
          </div>
        ) : (
          appointments.map((appt) => (
            <div key={appt.id} className="appointment-card">
              <div className="appointment-head">
                <h3>{appt.doctorName}</h3>
                <span className={`appointment-status status-${appt.status || 'pending'}`}>
                  {appt.status || 'pending'}
                </span>
              </div>
              <p className="appointment-specialization">
                {appt.doctorSpecialization}
              </p>
              <p className="appointment-when">
                📅 {new Date(appt.scheduledAt).toLocaleString()}
              </p>
              {appt.reason && (
                <p className="appointment-reason">
                  <strong>Reason:</strong> {appt.reason}
                </p>
              )}
              <button
                type="button"
                className="btn btn-unsave"
                onClick={() => handleCancelAppointment(appt.id)}
              >
                Cancel appointment
              </button>
            </div>
          ))
        )}
      </div>

      <div className="dashboard-header dashboard-header-spaced">
        <h1>Your Saved Events</h1>
        <p className="dashboard-subtitle">Here are the events you've saved:</p>
      </div>

      <div className="dashboard-actions">
        <Link to="/events" className="btn btn-primary">
          Browse All Events
        </Link>
      </div>

      <div className="saved-events-grid">
        {savedEvents.length === 0 ? (
          <div className="empty-state">
            <p>You haven't saved any events yet.</p>
            <Link to="/events" className="btn btn-secondary">
              Explore Events
            </Link>
          </div>
        ) : (
          savedEvents.map((event) => (
            <div key={event.id} className="saved-event-card">
              <h3>{event.title}</h3>
              <p className="event-date">📅 {formatEventDate(event)}</p>
              {event.description && (
                <p className="event-desc">{event.description}</p>
              )}
              {event.saved_at && (
                <p className="event-saved-at">
                  Saved on: {new Date(event.saved_at).toLocaleDateString()}
                </p>
              )}
              <button
                className="btn btn-unsave"
                onClick={() => handleUnsave(event.id)}
              >
                Remove from saved
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;