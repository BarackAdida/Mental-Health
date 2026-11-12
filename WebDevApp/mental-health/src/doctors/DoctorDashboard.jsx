import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await apiFetch('appointments/doctor');
      if (res.ok) setAppointments(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await apiFetch('doctors/me');
      if (res.ok) {
        const data = await res.json();
        setDoctor(data);
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  }, [fetchAppointments]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('doctors/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      setDoctor(data.doctor);
      fetchAppointments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiFetch('doctors/logout', { method: 'POST' });
    setDoctor(null);
    setAppointments([]);
    setId('');
    setName('');
  };

  const toggleAvailability = async () => {
    try {
      const res = await apiFetch('doctors/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !doctor.isAvailable })
      });
      if (res.ok) {
        const updated = await res.json();
        setDoctor(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!doctor) {
    return (
      <div className="doc-dash-container">
        <div className="doc-login-card">
          <h2>Doctor Portal</h2>
          <p>Sign in to manage your schedule.</p>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Doctor ID</label>
              <input 
                type="number" 
                value={id} 
                onChange={e => setId(e.target.value)} 
                required 
                placeholder="e.g. 1"
              />
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                placeholder="Dr. Wanjiku Mwangi"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-login">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-dash-container">
      <div className="doc-dash-header">
        <div>
          <h1>Welcome, {doctor.name}</h1>
          <p>{doctor.specialization}</p>
        </div>
        <button onClick={handleLogout} className="btn-logout">Log Out</button>
      </div>

      <div className="doc-dash-grid">
        <div className="doc-panel">
          <h2>Availability Status</h2>
          <div className="availability-toggle">
            <span className={`status-text ${doctor.isAvailable ? 'text-green' : 'text-red'}`}>
              {doctor.isAvailable ? 'You are currently Accepting Patients' : 'You are currently Not Accepting Patients'}
            </span>
            <button 
              className={`toggle-btn ${doctor.isAvailable ? 'on' : 'off'}`}
              onClick={toggleAvailability}
            >
              <div className="toggle-circle" />
            </button>
          </div>
          <p className="hint-text">When turned off, patients cannot book new appointments with you.</p>
        </div>

        <div className="doc-panel">
          <h2>My Appointments ({appointments.length}/5)</h2>
          {appointments.length === 0 ? (
            <p className="no-data">No upcoming appointments.</p>
          ) : (
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Patient Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr key={appt.id}>
                    <td>{new Date(appt.scheduledAt).toLocaleString()}</td>
                    <td>{appt.reason || 'N/A'}</td>
                    <td><span className="badge-scheduled">{appt.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;