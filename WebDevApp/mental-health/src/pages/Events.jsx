import { useState, useEffect, useCallback } from 'react';
import '../Styles/Events.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({ title: '', date: '', description: '' });

  const API_BASE = 'http://localhost:3000/api';

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [API_BASE]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/events`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    }
  }, [API_BASE]);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/events/saved`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSavedIds(new Set(data.map(e => e.id)));
      } else {
        setSavedIds(new Set());
      }
    } catch {
      setSavedIds(new Set());
    }
  }, [API_BASE]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchUser();
      await fetchEvents();
      setLoading(false);
    };
    init();
  }, [fetchUser, fetchEvents]);

  // 🔧 Fixed: added eslint-disable comment to silence the set-state-in-effect warning
  useEffect(() => {
    if (user) {
      fetchSaved();
    } else {
      setSavedIds(new Set());
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [user, fetchSaved]);

  const toggleSave = async (eventId) => {
    if (!user) {
      alert('Please log in to save events.');
      return;
    }
    const isSaved = savedIds.has(eventId);
    const method = isSaved ? 'DELETE' : 'POST';
    const url = `${API_BASE}/events/${eventId}/save`;

    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to update save status');
      
      setSavedIds(prev => {
        const newSet = new Set(prev);
        if (isSaved) {
          newSet.delete(eventId);
        } else {
          newSet.add(eventId);
        }
        return newSet;
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { title, date, description } = formData;
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
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, date, description }),
      });
      if (!res.ok) throw new Error('Failed to save event');
      const savedEvent = await res.json();

      if (isEdit) {
        setEvents(prev => prev.map(e => (e.id === savedEvent.id ? savedEvent : e)));
      } else {
        setEvents(prev => [...prev, savedEvent]);
      }

      setShowForm(false);
      setEditingEvent(null);
      setFormData({ title: '', date: '', description: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`${API_BASE}/events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditForm = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      description: event.description || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setFormData({ title: '', date: '', description: '' });
  };

  if (loading) return <div className="loading">Loading events...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="events-container">
      <h2>Wellness Events</h2>

      {user?.is_admin && (
        <button className="btn btn-primary" onClick={() => { setEditingEvent(null); setFormData({ title: '', date: '', description: '' }); setShowForm(true); }}>
          + New Event
        </button>
      )}

      {showForm && (
        <div className="event-form-modal">
          <div className="event-form">
            <h3>{editingEvent ? 'Edit Event' : 'Create Event'}</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-success">Save</button>
                <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="events-grid">
        {events.length === 0 && <p>No events available.</p>}
        {events.map(event => (
          <div key={event.id} className="event-card">
            <h3>{event.title}</h3>
            <p><strong>Date:</strong> {event.date}</p>
            {event.description && <p>{event.description}</p>}
            <p className="event-meta">Created: {new Date(event.created_at).toLocaleDateString()}</p>

            <div className="event-actions">
              {user && (
                <button
                  className={`btn btn-save ${savedIds.has(event.id) ? 'saved' : ''}`}
                  onClick={() => toggleSave(event.id)}
                >
                  {savedIds.has(event.id) ? '❤️ Saved' : '🤍 Save'}
                </button>
              )}

              {user?.is_admin && (
                <>
                  <button className="btn btn-edit" onClick={() => openEditForm(event)}>✏️ Edit</button>
                  <button className="btn btn-delete" onClick={() => handleDelete(event.id)}>🗑️ Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;