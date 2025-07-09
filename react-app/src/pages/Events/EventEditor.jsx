import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../../components/FileUpload/FileUpload';
import { parseEventFromFile } from '../../services/eventParser';
import './EventEditor.css';

// Event types removed - no longer using predefined types

export default function EventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const isNew = !id;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    start_time: '',
    end_time: '',
    guest_count: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    website: '',
    venue: '',
    venue_address: '',
    venue_contact: '',
    description: '',
    notes: '',
    special_requests: '',
    budget: '',
    status: 'planning',
    flyer_url: ''
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [flyerFile, setFlyerFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (!isNew) {
      loadEvent();
    }
  }, [id, isNew]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const eventDoc = await getDoc(doc(db, 'events', id));
      
      if (!eventDoc.exists()) {
        setError('Event not found');
        return;
      }

      const data = eventDoc.data();
      
      // Format date for input
      let formattedDate = '';
      if (data.event_date) {
        const date = data.event_date.toDate?.() || new Date(data.event_date);
        formattedDate = date.toISOString().split('T')[0];
      }
      
      setFormData({
        name: data.name || '',
        event_date: formattedDate,
        start_time: data.start_time || '',
        end_time: data.end_time || '',
        guest_count: data.guest_count || '',
        client_name: data.client_name || '',
        client_email: data.client_email || '',
        client_phone: data.client_phone || '',
        website: data.website || '',
        venue: data.venue || '',
        venue_address: data.venue_address || '',
        venue_contact: data.venue_contact || '',
        description: data.description || '',
        notes: data.notes || '',
        special_requests: data.special_requests || '',
        budget: data.budget || '',
        status: data.status || 'planning',
        flyer_url: data.flyer_url || ''
      });
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Event name is required';
    }
    
    if (!formData.event_date) {
      errors.event_date = 'Event date is required';
    }
    
    if (!formData.client_name.trim()) {
      errors.client_name = 'Client name is required';
    }
    
    if (formData.client_email && !isValidEmail(formData.client_email)) {
      errors.client_email = 'Invalid email address';
    }
    
    if (formData.guest_count && formData.guest_count < 1) {
      errors.guest_count = 'Guest count must be at least 1';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleFlyerUpload = async (file) => {
    if (!file) {
      setFlyerFile(null);
      return;
    }

    setFlyerFile(file);
    setParsing(true);
    setError(null);

    try {
      // Parse event details from the file
      const parsedData = await parseEventFromFile(file);
      
      if (parsedData) {
        // Update form with parsed data
        const updates = {};
        if (parsedData.name && !formData.name) updates.name = parsedData.name;
        if (parsedData.event_date && !formData.event_date) {
          const date = new Date(parsedData.event_date);
          updates.event_date = date.toISOString().split('T')[0];
        }
        if (parsedData.start_time && !formData.start_time) updates.start_time = parsedData.start_time;
        if (parsedData.venue && !formData.venue) updates.venue = parsedData.venue;
        if (parsedData.venue_address && !formData.venue_address) updates.venue_address = parsedData.venue_address;
        if (parsedData.description && !formData.description) updates.description = parsedData.description;
        if (parsedData.guest_count && !formData.guest_count) updates.guest_count = parsedData.guest_count;
        if (parsedData.website && !formData.website) updates.website = parsedData.website;
        
        if (Object.keys(updates).length > 0) {
          setFormData(prev => ({ ...prev, ...updates }));
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Could not parse event details from file. You can still fill in the details manually.');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Convert date string to Date object
      const eventDate = new Date(formData.event_date);
      eventDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      // Upload flyer if selected
      let flyerUrl = formData.flyer_url;
      if (flyerFile) {
        setUploading(true);
        try {
          const storageRef = ref(storage, `events/${isNew ? 'new' : id}/flyers/${flyerFile.name}`);
          const snapshot = await uploadBytes(storageRef, flyerFile);
          flyerUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.error('Error uploading flyer:', uploadErr);
          setError('Failed to upload flyer. Event will be saved without it.');
        } finally {
          setUploading(false);
        }
      }

      // Prepare event data
      const eventData = {
        ...formData,
        event_date: eventDate,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        flyer_url: flyerUrl,
        updated_at: serverTimestamp()
      };
      
      if (isNew) {
        // Add creation metadata
        eventData.created_at = serverTimestamp();
        eventData.created_by = currentUser.email;
        eventData.allergens = []; // Initialize empty allergens array
        
        // Generate ID
        const newId = doc(db, 'events').id;
        await setDoc(doc(db, 'events', newId), eventData);
        
        navigate(`/events/${newId}`);
      } else {
        // Update existing event
        await updateDoc(doc(db, 'events', id), eventData);
        navigate(`/events/${id}`);
      }
    } catch (err) {
      console.error('Error saving event:', err);
      setError('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate(id ? `/events/${id}` : '/events');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading event...</p>
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/events')}
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="event-editor">
      <form onSubmit={handleSubmit}>
        <div className="editor-header">
          <h1>{isNew ? 'Create New Event' : 'Edit Event'}</h1>
          <div className="editor-actions">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="editor-content">
          {/* Basic Information */}
          <section className="editor-section">
            <h2>Event Information</h2>
            
            <div className="form-group">
              <label htmlFor="name">Event Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter event name"
                className={validationErrors.name ? 'error' : ''}
              />
              {validationErrors.name && (
                <span className="field-error">{validationErrors.name}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="event_date">Event Date *</label>
                <input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className={validationErrors.event_date ? 'error' : ''}
                />
                {validationErrors.event_date && (
                  <span className="field-error">{validationErrors.event_date}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="start_time">Start Time</label>
                <input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="end_time">End Time</label>
                <input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="guest_count">Guest Count</label>
                <input
                  id="guest_count"
                  type="number"
                  value={formData.guest_count}
                  onChange={(e) => handleInputChange('guest_count', e.target.value)}
                  min="1"
                  placeholder="0"
                  className={validationErrors.guest_count ? 'error' : ''}
                />
                {validationErrors.guest_count && (
                  <span className="field-error">{validationErrors.guest_count}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="budget">Budget ($)</label>
                <input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Event description..."
                rows="3"
              />
            </div>
          </section>

          {/* Client Information */}
          <section className="editor-section">
            <h2>Client Information</h2>
            
            <div className="form-group">
              <label htmlFor="client_name">Client Name *</label>
              <input
                id="client_name"
                type="text"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                placeholder="Enter client name"
                className={validationErrors.client_name ? 'error' : ''}
              />
              {validationErrors.client_name && (
                <span className="field-error">{validationErrors.client_name}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="client_email">Email</label>
                <input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  placeholder="client@example.com"
                  className={validationErrors.client_email ? 'error' : ''}
                />
                {validationErrors.client_email && (
                  <span className="field-error">{validationErrors.client_email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="client_phone">Phone</label>
                <input
                  id="client_phone"
                  type="tel"
                  value={formData.client_phone}
                  onChange={(e) => handleInputChange('client_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </section>

          {/* Venue Information */}
          <section className="editor-section">
            <h2>Venue Information</h2>
            
            <div className="form-group">
              <label htmlFor="venue">Venue Name</label>
              <input
                id="venue"
                type="text"
                value={formData.venue}
                onChange={(e) => handleInputChange('venue', e.target.value)}
                placeholder="Enter venue name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="venue_address">Venue Address</label>
              <textarea
                id="venue_address"
                value={formData.venue_address}
                onChange={(e) => handleInputChange('venue_address', e.target.value)}
                placeholder="Enter venue address"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="venue_contact">Venue Contact</label>
              <input
                id="venue_contact"
                type="text"
                value={formData.venue_contact}
                onChange={(e) => handleInputChange('venue_contact', e.target.value)}
                placeholder="Contact name or phone"
              />
            </div>
          </section>

          {/* Event Flyer/Invitation */}
          <section className="editor-section">
            <h2>Event Flyer/Invitation</h2>
            
            <div className="form-group">
              <label>Upload Flyer or Invitation</label>
              <FileUpload
                onFileSelect={handleFlyerUpload}
                accept=".pdf,.png,.jpg,.jpeg"
                multiple={false}
              />
              {formData.flyer_url && (
                <div className="flyer-preview">
                  <p>Current flyer: <a href={formData.flyer_url} target="_blank" rel="noopener noreferrer">View Flyer</a></p>
                </div>
              )}
              {parsing && (
                <div className="parsing-indicator">
                  <div className="spinner"></div>
                  <p>Parsing event details from file...</p>
                </div>
              )}
            </div>
          </section>

          {/* Additional Details */}
          <section className="editor-section">
            <h2>Additional Details</h2>
            
            <div className="form-group">
              <label htmlFor="special_requests">Special Requests</label>
              <textarea
                id="special_requests"
                value={formData.special_requests}
                onChange={(e) => handleInputChange('special_requests', e.target.value)}
                placeholder="Any special requests or requirements..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Internal Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notes for the team..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="planning">Planning</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}