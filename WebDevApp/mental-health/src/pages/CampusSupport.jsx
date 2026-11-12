import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';
import '../Styles/CampusSupport.css';

const UNAVAILABLE = 'Services unavailable right now.';

const StarRating = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= Math.round(rating || 0) ? 'star filled' : 'star'}>
        ★
      </span>
    );
  }
  return <div className="star-container">{stars}</div>;
};

const fetchServices = async () => {
  try {
    const res = await apiFetch('partner/counseling');
    if (!res.ok) {
      return { stale: false, asOf: null, error: UNAVAILABLE };
    }
    const body = await res.json();
    if (Array.isArray(body)) {
      return { stale: false, asOf: null, error: '' };
    }
    const { data, stale, asOf } = body || {};
    if (!Array.isArray(data)) {
      return { stale: false, asOf: null, error: UNAVAILABLE };
    }
    return { stale: Boolean(stale), asOf: asOf || null, error: '' };
  } catch {
    return { stale: false, asOf: null, error: UNAVAILABLE };
  }
};

const emptyBooking = { date: '', time: '', reason: '' };

const CampusSupport = () => {
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

  const [reviewDoctor, setReviewDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      const result = await fetchServices();
      setServicesError(result.error);
      setServicesStale(result.stale);
      setServicesAsOf(result.asOf);

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

  const openReviews = async (doctor) => {
    setReviewDoctor(doctor);
    setReviewsLoading(true);
    setReviews([]);
    setReviewSuccess('');
    setReviewError('');
    
    try {
      const res = await apiFetch(`doctors/${doctor.id}/reviews`);
      if (res.ok) {
        setReviews(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
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

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');
    
    try {
      const res = await apiFetch(`doctors/${reviewDoctor.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating, comment: newComment })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');
      
      setReviewSuccess('Review submitted successfully!');
      setNewComment('');
      loadData();
      
      const reviewsRes = await apiFetch(`doctors/${reviewDoctor.id}/reviews`);
      if (reviewsRes.ok) setReviews(await reviewsRes.json());
      
    } catch (err) {
      setReviewError(err.message);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="support-container">
      <h2>Campus Support Doctors</h2>
      <p className="support-intro">Choose a doctor and pick a time. Doctors are ranked by highest rating.</p>

      {!doctorsLoading && servicesStale && servicesAsOf && (
        <div className="support-stale-banner" role="status">
          <strong>Showing saved data</strong> from{' '}
          {new Date(servicesAsOf).toLocaleTimeString()}. The partner is not responding — this is not live.
        </div>
      )}

      {!doctorsLoading && servicesError && (
        <div className="support-error">
          <p>{servicesError}</p>
          <button onClick={handleRetry}>Try again</button>
        </div>
      )}

      {doctorsLoading && <p className="support-note">Loading doctors…</p>}
      {!doctorsLoading && needsLogin && <div className="support-error"><p>Please <a href="/login">log in</a> to book.</p></div>}

      {!doctorsLoading && !needsLogin && (
        <div className="support-grid">
          {doctors.map((doc, index) => (
            <article key={doc.id} className="support-card">
              <div className="ranking-badge">#{index + 1}</div>
              <div className="support-card-head">
                <h3>{doc.name}</h3>
                {doc.partnerId && <span className="partner-badge">StrathShop</span>}
              </div>
              <p className="support-provider">{doc.specialization}</p>
              
              <div className="doctor-metrics">
                <div className="metric">
                  <span className="metric-label">Rating</span>
                  {doc.rating ? (
                    <div className="rating-wrapper">
                      <StarRating rating={doc.rating} />
                      <span className="rating-number">{Number(doc.rating).toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="not-rated">Not yet rated</span>
                  )}
                </div>
                
                <div className="metric">
                  <span className="metric-label">Status</span>
                  <span className={`status-badge ${doc.isAvailable ? 'available' : 'busy'}`}>
                    {doc.isAvailable ? 'Available' : 'Busy'}
                  </span>
                </div>
              </div>

              <div className="doctor-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="support-retry" onClick={() => openBooking('doctor', doc)} style={{ flex: 1 }}>
                  Book
                </button>
                <button type="button" className="support-retry" onClick={() => openReviews(doc)} style={{ flex: 1, backgroundColor: '#e2e8f0', color: '#2d3748' }}>
                  Reviews
                </button>
              </div>
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

      {reviewDoctor && (
        <div className="support-modal-overlay" onClick={() => setReviewDoctor(null)}>
          <div className="support-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Reviews for {reviewDoctor.name}</h3>
              <button onClick={() => setReviewDoctor(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h4 style={{ marginTop: 0 }}>Leave a Review</h4>
                {reviewError && <div className="support-error"><p>{reviewError}</p></div>}
                {reviewSuccess && <div className="support-note" style={{ backgroundColor: '#f0fff4', color: '#38a169' }}>{reviewSuccess}</div>}
                
                <form onSubmit={submitReview}>
                  <div className="form-group">
                    <label>Rating (1-5)</label>
                    <select value={newRating} onChange={e => setNewRating(Number(e.target.value))}>
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Very Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Poor</option>
                      <option value={1}>1 - Terrible</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Comment</label>
                    <textarea rows="3" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="How was your experience?" />
                  </div>
                  <button type="submit" className="btn btn-success" style={{ width: '100%' }}>Submit Review</button>
                </form>
              </div>

              <div>
                <h4 style={{ marginTop: 0 }}>Patient Comments ({reviews.length})</h4>
                {reviewsLoading ? (
                  <p>Loading...</p>
                ) : reviews.length === 0 ? (
                  <p style={{ color: '#a0aec0', fontStyle: 'italic' }}>No reviews yet. Be the first!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {reviews.map(rev => (
                      <div key={rev.id} style={{ background: '#f7fafc', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong>{rev.patient_name}</strong>
                          <StarRating rating={rev.rating} />
                        </div>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#4a5568' }}>{rev.comment || "No comment provided."}</p>
                        <small style={{ color: '#a0aec0' }}>{new Date(rev.created_at).toLocaleDateString()}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusSupport;