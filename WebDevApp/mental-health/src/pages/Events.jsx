import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';
import '../Styles/Events.css';

// The API returns startTime (an ISO timestamp). Older code expected `date`,
// so accept either, and show "TBA" instead of "Invalid Date" if neither is there.
const getRawDate = (event) =>
  event?.startTime || event?.start_time || event?.date || '';

const formatWhen = (event) => {
  const raw = getRawDate(event);
  if (!raw) return 'TBA';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString();
};

// Convert whatever the API gives us into a value a <input type="date"> accepts.
const pad = (n) => String(n).padStart(2, '0');
const toDateInputValue = (event) => {
  const raw = getRawDate(event);
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const emptyForm = { title: '', date: '', description: '' };

const Events = () => {
  const [events, setEvents] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiFetch('auth/me');
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await apiFetch('events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await apiFetch('events/saved');
      if (res.ok) {
        const data = await res.json();
        setSavedIds(new Set((Array.isArray(data) ? data : []).map((e) => e.id)));
      } else {
        setSavedIds(new Set());
      }
    } catch {
      setSavedIds(new Set());
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchUser();
      await fetchEvents();
      setLoading(false);
    };
    init();
  }, [fetchUser, fetchEvents]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (user) {
      fetchSaved();
    } else {
      setSavedIds(new Set());
    }
  }, [user, fetchSaved]);

  const toggleSave = async (eventId) => {
    if (!user) {
      alert('Please log in to save events.');
      return;
    }
    const isSaved = savedIds.has(eventId);

    try {
      const res = await apiFetch(`events/${eventId}/save`, {
        method: isSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to update save status');

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(eventId);
        else next.add(eventId);
        return next;
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

    try {
      const res = await apiFetch(
        isEdit ? `events/${editingEvent.id}` : 'events',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, date, description }),
        }
      );
      if (!res.ok) throw new Error('Failed to save event');
      const savedEvent = await res.json();

      if (isEdit) {
        setEvents((prev) => prev.map((ev) => (ev.id === savedEvent.id ? savedEvent : ev)));
      } else {
        setEvents((prev) => [...prev, savedEvent]);
      }

      closeForm();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await apiFetch(`events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditForm = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title ?? '',
      date: toDateInputValue(event),
      description: event.description ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setFormData(emptyForm);
  };

  const openCreateForm = () => {
    setEditingEvent(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  if (loading) return <div className="loading">Loading events...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="events-container">
      <h2>Wellness Events</h2>

      {user?.is_admin && (
        <button className="btn btn-primary" onClick={openCreateForm}>
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
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-success">
                  Save
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="events-grid">
        {events.length === 0 && <p>No events available.</p>}

        {events.map((event) => (
          <div key={event.id} className="event-card">
            <h3>{event.title}</h3>
            <p><strong>Date:</strong> {formatWhen(event)}</p>
            {event.description && <p>{event.description}</p>}
            {event.created_at && (
              <p className="event-meta">
                Created: {new Date(event.created_at).toLocaleDateString()}
              </p>
            )}

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
                  <button className="btn btn-edit" onClick={() => openEditForm(event)}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-delete" onClick={() => handleDelete(event.id)}>
                    🗑️ Delete
                  </button>
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