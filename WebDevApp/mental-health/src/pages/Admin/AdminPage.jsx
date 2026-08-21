import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';

const API_BASE = 'http://localhost:3000/api';

function AdminPage() {
  const navigate = useNavigate();

  // ---------- State ----------
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);               // logged‑in user
  const [users, setUsers] = useState([]);               // all users (admin only)
  const [events, setEvents] = useState([]);
  const [psychologists, setPsychologists] = useState([
    'Dr. Jane Kamau',
    'Dr. Peter Ochieng',
    'Dr. Mary Akinyi',
    'Dr. James Mwangi',
    'Dr. Sarah Wanjiru',
  ]);

  // Event form state
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    description: '',
  });

  const [newPsychologist, setNewPsychologist] = useState('');
  const [error, setError] = useState('');

  // ---------- Helper: fetch with credentials ----------
  const fetchWithAuth = (url, options = {}) =>
    fetch(url, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });

  // ---------- Fetch logged‑in user ----------
  const fetchCurrentUser = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/me`);
      if (!res.ok) {
        if (res.status === 401) {
          navigate('/login');
          return null;
        }
        throw new Error('Failed to fetch user');
      }
      const data = await res.json();
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // ---------- Fetch all users (admin only) ----------
  const fetchAllUsers = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/admin/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------- Fetch all events ----------
  const fetchEvents = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------- Initial load ----------
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      // Check if admin
      if (!currentUser.is_admin) {
        navigate('/');
        return;
      }
      setUser(currentUser);
      await Promise.all([fetchAllUsers(), fetchEvents()]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  // ---------- Promote / Demote user ----------
  const toggleAdmin = async (targetUser) => {
    const newAdminStatus = !targetUser.is_admin;
    if (targetUser.id === user.id && newAdminStatus === false) {
      alert('You cannot demote yourself.');
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/auth/admin/users`, {
        method: 'PUT',
        body: JSON.stringify({
          search: targetUser.id, // search by ID (exact)
          is_admin: newAdminStatus,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
      // Refresh user list
      await fetchAllUsers();
      // Also refresh current user data (in case you demote yourself, but we blocked it)
      const updatedMe = await fetchCurrentUser();
      if (updatedMe) setUser(updatedMe);
    } catch (err) {
      alert(err.message);
    }
  };

  // ---------- Event CRUD ----------
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    const { title, date, description } = eventForm;
    if (!title || !date) {
      alert('Title and date are required.');
      return;
    }

    const isEdit = !!editingEvent;
    const url = isEdit
      ? `${API_BASE}/events/${editingEvent.id}`
      : `${API_BASE}/events`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({ title, date, description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save event');
      }
      const savedEvent = await res.json();
      // Update local events list
      if (isEdit) {
        setEvents((prev) => prev.map((ev) => (ev.id === savedEvent.id ? savedEvent : ev)));
      } else {
        setEvents((prev) => [...prev, savedEvent]);
      }
      // Reset form
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
      const res = await fetchWithAuth(`${API_BASE}/events/${id}`, {
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

  // ---------- Psychologists (local only) ----------
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

  // ---------- Render ----------
  if (loading) return <div className="loading">Loading admin panel...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <main className="admin-page">
      <div className="admin-container">
        <h1>Admin Dashboard</h1>
        <p className="admin-subtitle">Manage events, users, and more.</p>

        <div className="admin-grid">
          {/* ----- Manage Users ----- */}
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

          {/* ----- Manage Events ----- */}
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

          {/* ----- Manage Psychologists (local only) ----- */}
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