import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../config/api';
import './AdminPage.css';

function AdminPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [usersWithAppointments, setUsersWithAppointments] = useState([]);
  const [events, setEvents] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ title: '', date: '', description: '' });

  const [doctorForm, setDoctorForm] = useState({ name: '', specialization: '', licenseNumber: '', phoneNumber: '', email: '' });
  const [error, setError] = useState('');

  const fetchCurrentUser = useCallback(async () => {
    const res = await apiFetch('auth/me');
    if (!res.ok) { if (res.status === 401) navigate('/login'); return null; }
    return await res.json();
  }, [navigate]);

  const loadData = useCallback(async () => {
    try {
      const [uRes, apptRes, evRes, docRes] = await Promise.all([
        apiFetch('auth/admin/users'),
        apiFetch('auth/admin/users-with-appointments'),
        apiFetch('events'),
        apiFetch('doctors')
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (apptRes.ok) setUsersWithAppointments(await apptRes.json());
      if (evRes.ok) setEvents(await evRes.json());
      if (docRes.ok) setDoctors(await docRes.json());
    } catch {
      setError('Failed to load admin data');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const currentUser = await fetchCurrentUser();
      if (!currentUser) return;
      if (!currentUser.is_admin) { navigate('/'); return; }
      await loadData();
      setLoading(false);
    };
    init();
  }, [navigate, fetchCurrentUser, loadData]);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doctorForm)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDoctorForm({ name: '', specialization: '', licenseNumber: '', phoneNumber: '', email: '' });
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (!window.confirm('Delete this doctor?')) return;
    await apiFetch(`doctors/${id}`, { method: 'DELETE' });
    await loadData();
  };

  // FIXED: Proper payload mapping and error display
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    
    // Map 'date' from the form to 'startTime' as an ISO string for the backend
    const payload = {
      title: eventForm.title,
      description: eventForm.description,
      startTime: eventForm.date ? new Date(eventForm.date).toISOString() : undefined,
      date: eventForm.date // Keep for backwards compatibility
    };

    try {
      const isEdit = !!editingEvent;
      const res = await apiFetch(isEdit ? `events/${editingEvent.id}` : 'events', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to save event');
      }

      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({ title: '', date: '', description: '' });
      await loadData();
    } catch (err) {
      alert(`Error creating event: ${err.message}`);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await apiFetch(`events/${id}`, { method: 'DELETE' });
    await loadData();
  };

  if (loading) return <div className="loading">Loading admin panel...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <h1>Admin Dashboard</h1>
        
        <div className="admin-grid">
          <section className="admin-section">
            <h2>👥 Manage Users</h2>
            <ul className="item-list">
              {users.map((u) => (
                <li key={u.id}>
                  <div className="list-info">
                    <strong>{u.name}</strong>
                    <span>{u.email}</span>
                  </div>
                  <span className={`role-badge ${u.is_admin ? 'admin' : 'user'}`}>
                    {u.is_admin ? 'Admin' : 'User'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-section">
            <h2>👨🏾‍⚕️ Manage Doctors</h2>
            <form onSubmit={handleAddDoctor} className="admin-form">
              <div className="form-row">
                <input type="text" placeholder="Full Name" value={doctorForm.name} onChange={e => setDoctorForm({...doctorForm, name: e.target.value})} required />
                <input type="text" placeholder="Specialization" value={doctorForm.specialization} onChange={e => setDoctorForm({...doctorForm, specialization: e.target.value})} required />
              </div>
              <div className="form-row">
                <input type="text" placeholder="License No." value={doctorForm.licenseNumber} onChange={e => setDoctorForm({...doctorForm, licenseNumber: e.target.value})} required />
                <input type="text" placeholder="Phone" value={doctorForm.phoneNumber} onChange={e => setDoctorForm({...doctorForm, phoneNumber: e.target.value})} required />
              </div>
              <input type="email" placeholder="Email" value={doctorForm.email} onChange={e => setDoctorForm({...doctorForm, email: e.target.value})} required />
              <button type="submit" className="admin-btn">Add Doctor</button>
            </form>

            <ul className="item-list scrollable">
              {doctors.map(doc => (
                <li key={doc.id}>
                  <div className="list-info">
                    <strong>{doc.name}</strong>
                    <span>{doc.specialization}</span>
                  </div>
                  <button className="admin-btn small delete" onClick={() => handleDeleteDoctor(doc.id)}>✕</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-section span-2">
            <h2>📋 All User Bookings (Doctors & Services)</h2>
            <div className="appointments-grid">
              {usersWithAppointments.map((u) => (
                <div key={u.id} className="user-booking-card">
                  <h4>{u.name} <span>({u.email})</span></h4>
                  {u.appointments.length === 0 ? (
                    <p className="empty-text">No bookings yet.</p>
                  ) : (
                    <ul className="booking-list">
                      {u.appointments.map((appt) => (
                        <li key={appt.id}>
                          <div>
                            {appt.type === 'service' ? (
                              <strong>🛍️ {appt.serviceName} <br/><small>via {appt.providerName}</small></strong>
                            ) : (
                              <strong>👨🏾‍⚕️ {appt.doctorName} <br/><small>{appt.doctorSpecialization}</small></strong>
                            )}
                          </div>
                          <span className="booking-date">{new Date(appt.scheduledAt).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <h2>📅 Manage Events</h2>
            <button className="admin-btn" onClick={() => { setEditingEvent(null); setEventForm({ title: '', date: '', description: '' }); setShowEventForm(true); }}>
              + Create Event
            </button>
            
            {showEventForm && (
              <form onSubmit={handleEventSubmit} className="inline-event-form">
                <input type="text" placeholder="Event Title" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} required />
                <input type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} required />
                <textarea placeholder="Description" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} />
                <div className="form-actions">
                  <button type="submit" className="admin-btn">Save</button>
                  <button type="button" className="admin-btn secondary" onClick={() => setShowEventForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            <ul className="item-list scrollable mt-1">
              {events.map(e => (
                <li key={e.id}>
                  <div className="list-info">
                    <strong>{e.title}</strong>
                    <span>{new Date(e.startTime || e.date).toLocaleDateString()}</span>
                  </div>
                  <button className="admin-btn small delete" onClick={() => deleteEvent(e.id)}>✕</button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

export default AdminPage;