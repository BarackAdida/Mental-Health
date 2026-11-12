import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';
import './DoctorsPage.css';

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

const DoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await apiFetch('doctors');
      if (res.ok) {
        setDoctors(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const openReviews = async (doctor) => {
    setSelectedDoctor(doctor);
    setReviewsLoading(true);
    setReviews([]);
    setSubmitSuccess('');
    setSubmitError('');
    
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

  const submitReview = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    
    try {
      const res = await apiFetch(`doctors/${selectedDoctor.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating, comment: newComment })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');
      
      setSubmitSuccess('Review submitted successfully!');
      setNewComment('');
      fetchDoctors();
      
      const reviewsRes = await apiFetch(`doctors/${selectedDoctor.id}/reviews`);
      if (reviewsRes.ok) setReviews(await reviewsRes.json());
      
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  if (loading) return <div className="doctors-container"><p>Loading doctors...</p></div>;

  return (
    <div className="doctors-container">
      <div className="doctors-header">
        <h1>Our Doctors</h1>
        <p>Book an appointment with the highest-rated professionals.</p>
      </div>

      <div className="doctors-grid">
        {doctors.map(doc => (
          <div key={doc.id} className="doctor-card">
            <div className="doctor-card-header">
              <h2>{doc.name}</h2>
              {doc.partnerId && <span className="partner-badge">StrathShop</span>}
            </div>
            <p className="doctor-specialty">{doc.specialization}</p>
            
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

            <div className="doctor-actions">
              <button className="btn-primary" onClick={() => openReviews(doc)}>
                View Reviews & Ratings
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedDoctor && (
        <div className="modal-overlay" onClick={() => setSelectedDoctor(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reviews for {selectedDoctor.name}</h2>
              <button className="close-btn" onClick={() => setSelectedDoctor(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="write-review-section">
                <h3>Leave a Review</h3>
                {submitError && <div className="error-msg">{submitError}</div>}
                {submitSuccess && <div className="success-msg">{submitSuccess}</div>}
                
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
                    <textarea 
                      rows="3" 
                      value={newComment} 
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="How was your experience?"
                    />
                  </div>
                  <button type="submit" className="btn-submit">Submit Review</button>
                </form>
              </div>

              <div className="reviews-list-section">
                <h3>Patient Comments ({reviews.length})</h3>
                {reviewsLoading ? (
                  <p>Loading reviews...</p>
                ) : reviews.length === 0 ? (
                  <p className="no-reviews">No reviews yet. Be the first!</p>
                ) : (
                  <div className="reviews-list">
                    {reviews.map(rev => (
                      <div key={rev.id} className="review-item">
                        <div className="review-top">
                          <strong>{rev.patient_name}</strong>
                          <StarRating rating={rev.rating} />
                        </div>
                        <p className="review-comment">{rev.comment || "No comment provided."}</p>
                        <small className="review-date">
                          {new Date(rev.created_at).toLocaleDateString()}
                        </small>
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

export default DoctorsPage;