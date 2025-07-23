import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../../components/FileUpload/FileUpload';
import { parseEventFromFile } from '../../services/eventParser';
import { uploadEventImage, deleteEventImage } from '../../services/storageService';
import './EventEditor.css';

// Event types removed - no longer using predefined types

export default function EventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const isNew = !id;
  const endDateInputRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    start_date: '', // Changed from event_date
    end_date: '',   // NEW: End date for multi-day events
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
    flyer_url: '',
    event_images: [],
    // NEW: Enhanced dietary tracking
    dietary_restrictions: [],
    allergens: [],
    guests_with_restrictions: []
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [flyerFile, setFlyerFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [eventImages, setEventImages] = useState([]);
  const [uploadingEventImage, setUploadingEventImage] = useState(false);
  const eventImageInputRef = useRef(null);

  useEffect(() => {
    if (!isNew) {
      loadEvent();
    }
  }, [id, isNew]);

  // Handle clicking outside of date pickers to close them
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // If clicking outside any date input, blur all date inputs
      if (!e.target.matches('input[type="date"]')) {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
          if (input !== e.target) {
            input.blur();
          }
        });
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const eventDoc = await getDoc(doc(db, 'events', id));
      
      if (!eventDoc.exists()) {
        setError('Event not found');
        return;
      }

      const data = eventDoc.data();
      
      // Format dates for input
      let formattedStartDate = '';
      let formattedEndDate = '';
      
      // Handle legacy event_date field
      if (data.event_date) {
        const date = data.event_date.toDate ? data.event_date.toDate() : new Date(data.event_date);
        formattedStartDate = date.toISOString().split('T')[0];
        formattedEndDate = formattedStartDate; // Single day event
      }
      
      // Use start_date and end_date if available
      if (data.start_date) {
        const startDate = data.start_date.toDate ? data.start_date.toDate() : new Date(data.start_date);
        formattedStartDate = startDate.toISOString().split('T')[0];
      }
      
      if (data.end_date) {
        const endDate = data.end_date.toDate ? data.end_date.toDate() : new Date(data.end_date);
        formattedEndDate = endDate.toISOString().split('T')[0];
      }
      
      setFormData({
        name: data.name || '',
        start_date: formattedStartDate,
        end_date: formattedEndDate,
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
        flyer_url: data.flyer_url || '',
        event_images: data.event_images || [],
        // Enhanced dietary tracking
        dietary_restrictions: data.dietary_restrictions || [],
        allergens: data.allergens || [],
        guests_with_restrictions: data.guests_with_restrictions || []
      });
      
      // Set existing event images
      if (data.event_images) {
        setEventImages(data.event_images);
      }
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
    
    // When start date is selected, auto-focus end date and suggest next day
    if (field === 'start_date' && value) {
      // Calculate next day
      const startDate = new Date(value);
      startDate.setDate(startDate.getDate() + 1);
      const nextDay = startDate.toISOString().split('T')[0];
      
      // If end date is empty or before start date, set it to next day
      setFormData(prev => {
        if (!prev.end_date || prev.end_date < value) {
          return { ...prev, [field]: value, end_date: nextDay };
        }
        return { ...prev, [field]: value };
      });
      
      // Focus the end date input after a brief delay
      setTimeout(() => {
        if (endDateInputRef.current) {
          endDateInputRef.current.focus();
          // Don't auto-open picker - let user click to open it
        }
      }, 100);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Event name is required';
    }
    
    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }
    
    if (!formData.end_date) {
      errors.end_date = 'End date is required';
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
        if (parsedData.event_date) {
          const date = new Date(parsedData.event_date);
          const dateStr = date.toISOString().split('T')[0];
          if (!formData.start_date) updates.start_date = dateStr;
          if (!formData.end_date) updates.end_date = dateStr; // Single day event by default
        }
        // Handle new date fields from parser
        if (parsedData.start_date) {
          const date = new Date(parsedData.start_date);
          const dateStr = date.toISOString().split('T')[0];
          if (!formData.start_date) updates.start_date = dateStr;
        }
        if (parsedData.end_date) {
          const date = new Date(parsedData.end_date);
          const dateStr = date.toISOString().split('T')[0];
          if (!formData.end_date) updates.end_date = dateStr;
        }
        if (parsedData.start_time && !formData.start_time) updates.start_time = parsedData.start_time;
        if (parsedData.end_time && !formData.end_time) updates.end_time = parsedData.end_time;
        if (parsedData.venue && !formData.venue) updates.venue = parsedData.venue;
        if (parsedData.venue_address && !formData.venue_address) updates.venue_address = parsedData.venue_address;
        if (parsedData.description && !formData.description) updates.description = parsedData.description;
        if (parsedData.guest_count && !formData.guest_count) updates.guest_count = parsedData.guest_count;
        if (parsedData.website && !formData.website) updates.website = parsedData.website;
        
        // Always update event_images if they exist
        if (parsedData.event_images && parsedData.event_images.length > 0) {
          updates.event_images = parsedData.event_images;
        }
        
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

  const handleEventImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setUploadingEventImage(true);
    setError(null);
    
    try {
      // Upload image to Firebase Storage
      const eventId = id || `temp_${Date.now()}`;
      const imageUrl = await uploadEventImage(file, eventId);
      
      // Add to event images array
      setEventImages(prev => [...prev, imageUrl]);
      
      // Clear the input
      if (eventImageInputRef.current) {
        eventImageInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading event image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingEventImage(false);
    }
  };

  const removeEventImage = (index) => {
    if (window.confirm('Remove this image?')) {
      setEventImages(prev => prev.filter((_, i) => i !== index));
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
      // Convert date strings to Date objects with better handling
      const startDate = new Date(formData.start_date + 'T12:00:00');
      const endDate = new Date(formData.end_date + 'T12:00:00');
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setError('Invalid date format. Please check your dates.');
        setSaving(false);
        return;
      }
      
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
        start_date: startDate,
        end_date: endDate,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        flyer_url: flyerUrl,
        event_images: eventImages,
        updated_at: serverTimestamp()
      };
      
      // Debug logging
      console.log('Saving event with data:', {
        id: id || 'new',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        formData
      });
      
      if (isNew) {
        // Add creation metadata
        eventData.created_at = serverTimestamp();
        eventData.created_by = currentUser.email;
        eventData.allergens = []; // Initialize empty allergens array
        
        // Generate ID using collection reference
        const newId = doc(collection(db, 'events')).id;
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

  const handleCancel = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
              onClick={(e) => handleCancel(e)}
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
                <label htmlFor="start_date">Start Date *</label>
                <input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className={validationErrors.start_date ? 'error' : ''}
                />
                {validationErrors.start_date && (
                  <span className="field-error">{validationErrors.start_date}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="end_date">End Date *</label>
                <input
                  ref={endDateInputRef}
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  min={formData.start_date} // Can't end before it starts!
                  className={validationErrors.end_date ? 'error' : ''}
                />
                {validationErrors.end_date && (
                  <span className="field-error">{validationErrors.end_date}</span>
                )}
                <small className="field-help">
                  For single-day events, use the same date for start and end
                </small>
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
              <label htmlFor="client_name">Client Name</label>
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

          {/* Event Images */}
          <section className="editor-section">
            <h2>Event Images</h2>
            
            <div className="form-group">
              <label>Add Event Photos</label>
              
              <div className="event-images-upload">
                <input
                  ref={eventImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEventImageSelect}
                  style={{ display: 'none' }}
                />
                
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => eventImageInputRef.current?.click()}
                  disabled={uploadingEventImage}
                >
                  {uploadingEventImage ? 'Uploading...' : '📷 Add Photo'}
                </button>
                
                {eventImages.length > 0 && (
                  <div className="event-images-grid">
                    {eventImages.map((imageUrl, index) => (
                      <div key={index} className="event-image-item">
                        <img 
                          src={imageUrl} 
                          alt={`Event ${index + 1}`}
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => removeEventImage(index)}
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {eventImages.length === 0 && (
                  <p className="help-text">
                    Add photos from the event for reference. These will be displayed in the event viewer.
                  </p>
                )}
              </div>
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