import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Styles/Dashboard.css';

const API_BASE = 'http://localhost:3000/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [savedEvents, setSavedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ---------- Check authentication & fetch saved events ----------
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // 1. Get current user
        const userRes = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
        });
        if (!userRes.ok) {
          if (userRes.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch user');
        }
        const userData = await userRes.json();
        setUser(userData);

        // 2. Get saved events
        const eventsRes = await fetch(`${API_BASE}/events/saved`, {
          credentials: 'include',
        });
        if (!eventsRes.ok) throw new Error('Failed to fetch saved events');
        const eventsData = await eventsRes.json();
        setSavedEvents(eventsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [navigate]);

  // ---------- Logout ----------
  const handleLogout = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        navigate('/login');
      } else {
        alert('Logout failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ---------- Unsave an event ----------
  const handleUnsave = async (eventId) => {
    if (!window.confirm('Remove this event from your saved list?')) return;
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/save`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to unsave');
      setSavedEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      alert(err.message);
    }
  };

  // ---------- Render ----------
  if (loading) return <div className="dashboard-loading">Loading your dashboard...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!user) return null;

  return (
    <div className="dashboard-container">
      {/* ----- USER PROFILE CARD ----- */}
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

      {/* ----- DASHBOARD HEADER ----- */}
      <div className="dashboard-header">
        <h1>Your Saved Events</h1>
        <p className="dashboard-subtitle">Here are the events you've saved:</p>
      </div>

      <div className="dashboard-actions">
        <Link to="/events" className="btn btn-primary">Browse All Events</Link>
      </div>

      <div className="saved-events-grid">
        {savedEvents.length === 0 ? (
          <div className="empty-state">
            <p>You haven't saved any events yet.</p>
            <Link to="/events" className="btn btn-secondary">Explore Events</Link>
          </div>
        ) : (
          savedEvents.map((event) => (
            <div key={event.id} className="saved-event-card">
              <h3>{event.title}</h3>
              <p className="event-date">📅 {new Date(event.date).toLocaleDateString()}</p>
              {event.description && <p className="event-desc">{event.description}</p>}
              <p className="event-saved-at">Saved on: {new Date(event.saved_at).toLocaleDateString()}</p>
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