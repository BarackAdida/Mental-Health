import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../config/api';
import './AdminPage.css';

function AdminPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersWithAppointments, setUsersWithAppointments] = useState([]);
  const [events, setEvents] = useState([]);
  const [psychologists, setPsychologists] = useState([
    'Dr. Jane Kamau',
    'Dr. Peter Ochieng',
    'Dr. Mary Akinyi',
    'Dr. James Mwangi',
    'Dr. Sarah Wanjiru',
  ]);

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    description: '',
  });

  const [newPsychologist, setNewPsychologist] = useState('');
  const [error, setError] = useState('');

  const fetchCurrentUser = async () => {
    try {
      const res = await apiFetch('auth/me');
      if (!res.ok) {
        if (res.status === 401) {
          navigate('/login');
          return null;
        }
        throw new Error('Failed to fetch user');
      }
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await apiFetch('auth/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchUsersWithAppointments = async () => {
    try {
      const res = await apiFetch('auth/admin/users-with-appointments');
      if (!res.ok) throw new Error('Failed to fetch user appointments');
      const data = await res.json();
      setUsersWithAppointments(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await apiFetch('events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (!currentUser.is_admin) {
        navigate('/');
        return;
      }
      setUser(currentUser);
      await Promise.all([
        fetchAllUsers(),
        fetchUsersWithAppointments(),
        fetchEvents(),
      ]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const toggleAdmin = async (targetUser) => {
    const newAdminStatus = !targetUser.is_admin;
    if (targetUser.id === user.id && newAdminStatus === false) {
      alert('You cannot demote yourself.');
      return;
    }
    try {
      const res = await apiFetch('auth/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: targetUser.id,
          is_admin: newAdminStatus,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
      await fetchAllUsers();
      const updatedMe = await fetchCurrentUser();
      if (updatedMe) setUser(updatedMe);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    const { title, date, description } = eventForm;
    if (!title || !date) {
      alert('Title and date are required.');
      return;
    }

    const isEdit = !!editingEvent;
    const path = isEdit ? `events/${editingEvent.id}` : 'events';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save event');
      }
      const savedEvent = await res.json();
      if (isEdit) {
        setEvents((prev) => prev.map((ev) => (ev.id === savedEvent.id ? savedEvent : ev)));
      } else {
        setEvents((prev) => [...prev, savedEvent]);
      }
      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({ title: '', date: '', description: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      const res = await apiFetch(`events/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      date: event.date,
      description: event.description || '',
    });
    setShowEventForm(true);
  };

  const closeEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
    setEventForm({ title: '', date: '', description: '' });
  };

  const handlePsychSubmit = (e) => {
    e.preventDefault();
    const name = newPsychologist.trim();
    if (!name) {
      alert('Please enter a psychologist name.');
      return;
    }
    setPsychologists((prev) => {
      if (prev.includes(name)) {
        alert('This psychologist already exists.');
        return prev;
      }
      return [...prev, name];
    });
    setNewPsychologist('');
    alert('Psychologist added successfully!');
  };

  const deletePsychologist = (name) => {
    if (window.confirm(`Remove ${name}?`)) {
      setPsychologists((prev) => prev.filter((p) => p !== name));
    }
  };

  if (loading) return <div className="loading">Loading admin panel...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <h1>Admin Dashboard</h1>
        <p className="admin-subtitle">Manage events, users, and more.</p>

        <div className="admin-grid">
          <section className="admin-section">
            <h2>👥 Manage Users</h2>
            {users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <ul className="user-list">
                {users.map((u) => (
                  <li key={u.id}>
                    <span>
                      {u.name} ({u.email}) – {u.is_admin ? '👑 Admin' : '👤 User'}
                    </span>
                    <button
                      className="admin-btn small"
                      onClick={() => toggleAdmin(u)}
                    >
                      {u.is_admin ? 'Demote' : 'Promote'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-section">
            <h2>🩺 User Appointments</h2>
            {usersWithAppointments.length === 0 ? (
              <p>No appointments found.</p>
            ) : (
              <ul className="appt-user-list">
                {usersWithAppointments.map((u) => (
                  <li key={u.id} className="appt-user-item">
                    <div className="appt-user-header">
                      <strong>{u.name}</strong> <span>{u.email}</span>
                    </div>
                    {u.appointments.length === 0 ? (
                      <div className="appt-empty">No appointments</div>
                    ) : (
                      <ul className="appt-doc-list">
                        {u.appointments.map((appt) => (
                          <li key={appt.id}>
                            <span className="appt-doc-name">👨🏾‍⚕️ {appt.doctorName}</span>
                            <span className="appt-date">
                              {new Date(appt.scheduledAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-section">
            <h2>📅 Manage Events</h2>
            <button
              className="admin-btn"
              onClick={() => {
                setEditingEvent(null);
                setEventForm({ title: '', date: '', description: '' });
                setShowEventForm(true);
              }}
            >
              + Add New Event
            </button>

            {showEventForm && (
              <div className="event-form-overlay">
                <div className="event-form-card">
                  <h3>{editingEvent ? 'Edit Event' : 'Create Event'}</h3>
                  <form onSubmit={handleEventSubmit}>
                    <div className="form-group">
                      <label>Title *</label>
                      <input
                        type="text"
                        value={eventForm.title}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        value={eventForm.date}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        rows="3"
                        value={eventForm.description}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, description: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="admin-btn">
                        Save
                      </button>
                      <button
                        type="button"
                        className="admin-btn secondary"
                        onClick={closeEventForm}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="existing-list">
              <h3>Existing Events ({events.length})</h3>
              {events.length === 0 ? (
                <p>No events yet.</p>
              ) : (
                <ul>
                  {events.map((e) => (
                    <li key={e.id}>
                      <span>
                        {e.title} – {new Date(e.date).toLocaleDateString()}
                      </span>
                      <div className="event-actions">
                        <button
                          className="admin-btn small"
                          onClick={() => startEditEvent(e)}
                        >
                          ✏️
                        </button>
                        <button
                          className="admin-btn small delete"
                          onClick={() => deleteEvent(e.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="admin-section">
            <h2>👤 Add Psychologist</h2>
            <form onSubmit={handlePsychSubmit} className="admin-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newPsychologist}
                  onChange={(e) => setNewPsychologist(e.target.value)}
                  placeholder="e.g. Dr. Grace Achieng"
                  required
                />
              </div>
              <button type="submit" className="admin-btn">
                Add Psychologist
              </button>
            </form>

            <div className="existing-list">
              <h3>Existing Psychologists ({psychologists.length})</h3>
              {psychologists.length === 0 ? (
                <p>No psychologists added yet.</p>
              ) : (
                <ul>
                  {psychologists.map((name) => (
                    <li key={name}>
                      <span>{name}</span>
                      <button
                        onClick={() => deletePsychologist(name)}
                        className="admin-btn small delete"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default AdminPage;