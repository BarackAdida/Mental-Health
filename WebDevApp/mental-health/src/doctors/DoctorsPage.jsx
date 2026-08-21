import { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import './DoctorsPage.css';

const initialState = {
  doctors: [],
  loading: true,
  error: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_INIT':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, doctors: action.payload };
    case 'FETCH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const DoctorsPage = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    licenseNumber: '',
    phoneNumber: '',
    email: '',
  });
  const abortControllerRef = useRef(null);

  const fetchDoctors = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    dispatch({ type: 'FETCH_INIT' });
    try {
      const res = await fetch('http://localhost:5000/api/doctors', {
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch doctors');
      }
      const data = await res.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err) {
      if (err.name !== 'AbortError') {
        dispatch({ type: 'FETCH_FAILURE', payload: err.message });
      }
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDoctors]);

  const handleAdd = () => {
    setEditingDoctor(null);
    setFormData({ name: '', specialization: '', licenseNumber: '', phoneNumber: '', email: '' });
    setShowModal(true);
  };

  const handleEdit = (doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      licenseNumber: doctor.licenseNumber,
      phoneNumber: doctor.phoneNumber,
      email: doctor.email,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDoctor(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingDoctor
        ? `http://localhost:5000/api/doctors/${editingDoctor.id}`
        : 'http://localhost:5000/api/doctors';
      const method = editingDoctor ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Operation failed');
      }
      await fetchDoctors();
      handleCloseModal();
    } catch (err) {
      dispatch({ type: 'FETCH_FAILURE', payload: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/doctors/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      await fetchDoctors();
    } catch (err) {
      dispatch({ type: 'FETCH_FAILURE', payload: err.message });
    }
  };

  const { doctors, loading, error } = state;

  if (loading) return <div className="loading">Loading doctors...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="doctors-page">
      <div className="page-header">
        <h1>Doctors</h1>
        <button className="btn-add" onClick={handleAdd}>+ Add Doctor</button>
      </div>

      <div className="doctors-grid">
        {doctors.length === 0 ? (
          <p className="no-doctors">No doctors found. Add one now!</p>
        ) : (
          doctors.map((doc) => (
            <div key={doc.id} className="doctor-card">
              <h3>{doc.name}</h3>
              <p><strong>Specialization:</strong> {doc.specialization}</p>
              <p><strong>License:</strong> {doc.licenseNumber}</p>
              <p><strong>Phone:</strong> {doc.phoneNumber}</p>
              <p><strong>Email:</strong> {doc.email}</p>
              <div className="card-actions">
                <button className="btn-edit" onClick={() => handleEdit(doc)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(doc.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>License Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingDoctor ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsPage;