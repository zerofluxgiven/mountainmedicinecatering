import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, deleteDoc, collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { formatClockTime } from '../../utils/timeFormatting';
import { formatDate, formatDateRange } from '../../utils/dateFormatting';
import { useScrollVisibility } from '../../hooks/useScrollDirection';
import SmartShoppingList from '../../components/Shopping/SmartShoppingList';
import { generateEventPDF, enhancedPrint } from '../../services/pdfService';
import './EventViewer.css';

export default function EventViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { menus: globalMenus } = useApp();
  
  const [event, setEvent] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const isHeaderVisible = useScrollVisibility();

  useEffect(() => {
    loadEvent();
    loadAllergies();
    loadMenus();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvent = async () => {
    try {
      setLoading(true);
      const eventDoc = await getDoc(doc(db, 'events', id));
      
      if (!eventDoc.exists()) {
        setError('Event not found');
        return;
      }

      setEvent({ id: eventDoc.id, ...eventDoc.data() });
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const loadAllergies = () => {
    // Subscribe to allergies subcollection
    const q = query(collection(db, 'events', id, 'allergies'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allergyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllergies(allergyData);
    });

    return () => unsubscribe();
  };

  const loadMenus = () => {
    // Subscribe to menus for this event
    const q = query(collection(db, 'menus'), where('event_id', '==', id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMenus(menuData);
    });

    return () => unsubscribe();
  };

  const handleEdit = () => {
    navigate(`/events/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'events', id));
      navigate('/events');
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event');
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

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/events" className="btn btn-secondary">
          Back to Events
        </Link>
      </div>
    );
  }

  if (!event) return null;

  const isSelected = false; // Will be replaced with proper event mode later

  return (
    <div className="event-viewer">
      {/* Header and Tabs Container */}
      <div className={`event-header-container ${!isHeaderVisible ? 'scroll-hidden' : ''}`}>
        {/* Header */}
        <div className="event-header">
        <div className="event-header-content">
          <Link to="/events" className="back-link">
            ← Back to Events
          </Link>
          <div className="event-title-row">
            <h1>{event.name || 'Unnamed Event'}</h1>
          </div>
          
          <div className="event-actions">
            {hasRole('user') && (
              <>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/events/${id}/menus/new/plan`)}
                  title="Create a comprehensive menu plan for this event"
                >
                  🍽️ Plan Menu
                </button>
                
                <button 
                  className="btn btn-secondary"
                  onClick={handleEdit}
                >
                  ✏️ Edit
                </button>
                
                <button 
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  🗑️ Delete
                </button>
              </>
            )}
            
            <button 
              className="btn btn-secondary"
              onClick={() => enhancedPrint(`${event.name || 'Event'} - Mountain Medicine Kitchen`)}
            >
              🖨️ Print
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  await generateEventPDF(event, menus);
                } catch (error) {
                  console.error('Error generating PDF:', error);
                  alert('Failed to generate PDF. Please try again.');
                }
              }}
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="event-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`tab ${activeTab === 'allergies' ? 'active' : ''}`}
          onClick={() => setActiveTab('allergies')}
        >
          Allergies/Diet ({allergies.length})
        </button>
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
        <button
          className={`tab ${activeTab === 'menus' ? 'active' : ''}`}
          onClick={() => setActiveTab('menus')}
        >
          Menus
        </button>
        <button
          className={`tab ${activeTab === 'shopping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shopping')}
        >
          Shopping List
        </button>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Delete Event?</h3>
            <p>Are you sure you want to delete "{event.name}"? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="event-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {/* Key Information */}
            <div className="info-card">
              <h2>Event Information</h2>
              
              <div className="info-row">
                <span className="info-label">Date:</span>
                <span className="info-value">
                  {event.start_date && event.end_date ? 
                    formatDateRange(event.start_date, event.end_date) : 
                    formatDate(event.event_date || event.start_date)}
                </span>
              </div>
              
              {(event.start_time || event.end_time) && (
                <div className="info-row">
                  <span className="info-label">Time:</span>
                  <span className="info-value">
                    {event.start_time && event.end_time ? 
                      `${formatClockTime(event.start_time)} - ${formatClockTime(event.end_time)}` :
                      event.start_time ? formatClockTime(event.start_time) :
                      event.end_time ? formatClockTime(event.end_time) :
                      'Not specified'
                    }
                  </span>
                </div>
              )}
              
              <div className="info-row">
                <span className="info-label">Event Mode:</span>
                <span className={`info-value status-badge ${isSelected ? 'event-mode-on' : 'event-mode-off'}`}>
                  {isSelected ? 'On' : 'Off'}
                </span>
              </div>
              
              
              <div className="info-row">
                <span className="info-label">Guest Count:</span>
                <span className="info-value">{event.guest_count || '0'}</span>
              </div>
              
              {event.staff_count && (
                <div className="info-row">
                  <span className="info-label">Staff Count:</span>
                  <span className="info-value">{event.staff_count}</span>
                </div>
              )}
            </div>

            {/* Client Information */}
            <div className="info-card">
              <h2>Client Information</h2>
              
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span className="info-value">{event.client_name || 'Not specified'}</span>
              </div>
              
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">
                  {event.client_email ? (
                    <a href={`mailto:${event.client_email}`}>{event.client_email}</a>
                  ) : 'Not specified'}
                </span>
              </div>
              
              <div className="info-row">
                <span className="info-label">Phone:</span>
                <span className="info-value">
                  {event.client_phone ? (
                    <a href={`tel:${event.client_phone}`}>{event.client_phone}</a>
                  ) : 'Not specified'}
                </span>
              </div>
              
              <div className="info-row">
                <span className="info-label">Website:</span>
                <span className="info-value">
                  {event.website ? (
                    <a href={event.website} target="_blank" rel="noopener noreferrer">{event.website}</a>
                  ) : 'Not specified'}
                </span>
              </div>
            </div>

            {/* Venue Information */}
            <div className="info-card">
              <h2>Venue Information</h2>
              
              <div className="info-row">
                <span className="info-label">Venue:</span>
                <span className="info-value">{event.venue || 'Not specified'}</span>
              </div>
              
              <div className="info-row">
                <span className="info-label">Address:</span>
                <span className="info-value">{event.venue_address || 'Not specified'}</span>
              </div>
              
              {event.venue_contact && (
                <div className="info-row">
                  <span className="info-label">Contact:</span>
                  <span className="info-value">{event.venue_contact}</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="info-card">
              <h2>Quick Stats</h2>
              
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-value">{event.allergens?.length || 0}</span>
                  <span className="stat-label">Allergens</span>
                </div>
                
                <div className="stat">
                  <span className="stat-value">{allergies.length}</span>
                  <span className="stat-label">Individual Allergies</span>
                </div>
                
                <div className="stat">
                  <span className="stat-value">{allergies.filter(a => a.sub_menu_id).length}</span>
                  <span className="stat-label">Special Menu Guests</span>
                </div>
                
                <div className="stat">
                  <span className="stat-value">{event.menu_items?.length || 0}</span>
                  <span className="stat-label">Menu Items</span>
                </div>
              </div>
            </div>

            {/* Event Images */}
            {event.event_images && event.event_images.length > 0 && (
              <div className="info-card">
                <h2>Event Images</h2>
                <div className="event-images-grid">
                  {event.event_images.map((imageUrl, index) => (
                    <div key={index} className="event-image-container">
                      <img 
                        src={imageUrl} 
                        alt={`Event ${event.name} - Image ${index + 1}`}
                        className="event-image"
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="details-section">
            <div className="details-card">
              <h2>Event Details</h2>
              
              {event.description && (
                <div className="detail-block">
                  <h3>Description</h3>
                  <p>{event.description}</p>
                </div>
              )}
              
              {event.notes && (
                <div className="detail-block">
                  <h3>Notes</h3>
                  <p>{event.notes}</p>
                </div>
              )}
              
              {event.special_requests && (
                <div className="detail-block">
                  <h3>Special Requests</h3>
                  <p>{event.special_requests}</p>
                </div>
              )}
              
              {event.flyer_url && (
                <div className="detail-block">
                  <h3>Event Flyer/Invitation</h3>
                  <a href={event.flyer_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    📄 View Flyer
                  </a>
                </div>
              )}
              
              {(!event.description && !event.notes && !event.special_requests && !event.flyer_url) && (
                <p className="empty-message">No additional details available.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'allergies' && (
          <div className="allergies-section">
            <div className="allergies-header">
              <h2>Allergy Management</h2>
              {hasRole('user') && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/events/${id}/allergies`)}
                >
                  ➕ Manage Allergies/Diets
                </button>
              )}
            </div>

            {event.allergens && event.allergens.length > 0 && (
              <div className="allergen-summary">
                <h3>Summary of All Allergens</h3>
                <div className="allergen-tags">
                  {event.allergens.map(allergen => (
                    <span key={allergen} className="allergen-tag large">
                      ⚠️ {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Special Menu Assignments Summary */}
            {allergies.filter(a => a.sub_menu_id).length > 0 && (
              <div className="special-menu-summary">
                <h3>Special Menu Assignments</h3>
                <p className="special-menu-count">
                  {allergies.filter(a => a.sub_menu_id).length} guest{allergies.filter(a => a.sub_menu_id).length !== 1 ? 's' : ''} assigned to special menus
                </p>
              </div>
            )}

            {allergies.length > 0 ? (
              <div className="allergies-list">
                <h3>Individual Allergies ({allergies.length})</h3>
                {allergies.slice(0, 5).map(allergy => (
                  <div key={allergy.id} className="allergy-item">
                    <div className="allergy-info">
                      <h4>{allergy.guest_name}</h4>
                      <div className="allergy-details">
                        <span>Severity: {allergy.severity || 'Not specified'}</span>
                        {allergy.sub_menu_id && (
                          <span className="special-menu-indicator">
                            🍽️ Special Menu Assigned
                          </span>
                        )}
                        {allergy.notes && <span>Notes: {allergy.notes}</span>}
                      </div>
                      <div className="allergy-allergens">
                        {allergy.allergens?.map(allergen => (
                          <span key={allergen} className="allergen-tag">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {allergies.length > 5 && (
                  <p className="more-allergies">
                    And {allergies.length - 5} more...
                  </p>
                )}
              </div>
            ) : (
              <p className="empty-message">No individual allergies recorded yet.</p>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline-section">
            <h2>Event Timeline</h2>
            
            {event.timeline && event.timeline.length > 0 ? (
              <div className="timeline">
                {event.timeline.map((item, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-time">{formatClockTime(item.time)}</div>
                    <div className="timeline-content">
                      <h4>{item.activity}</h4>
                      {item.notes && <p>{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-message">No timeline created yet.</p>
            )}
          </div>
        )}

        {activeTab === 'menus' && (
          <div className="menus-section">
            <div className="menus-header">
              <h2>Event Menus</h2>
              {hasRole('user') && (
                <button 
                  onClick={() => navigate(`/events/${id}/menus/new/plan`)}
                  className="btn btn-primary"
                >
                  + Add Menu
                </button>
              )}
            </div>
            
            {menus.length > 0 ? (
              <div className="menus-grid">
                {menus.map(menu => (
                  <div key={menu.id} className="menu-card">
                    <div className="menu-card-header">
                      <h3>{menu.name}</h3>
                      <span className="menu-type">{menu.type}</span>
                    </div>
                    
                    {menu.description && (
                      <p className="menu-description">{menu.description}</p>
                    )}
                    
                    <div className="menu-stats">
                      <span>{menu.days?.length || 0} days</span>
                      <span>
                        {menu.days?.reduce((total, day) => 
                          total + (day.meals?.length || 0), 0
                        ) || 0} meals
                      </span>
                    </div>
                    
                    <div className="menu-actions">
                      <Link 
                        to={`/menus/${menu.id}`} 
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </Link>
                      {hasRole('user') && (
                        <Link 
                          to={`/events/${id}/menus/${menu.id}/plan`} 
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No menus created for this event yet.</p>
                {hasRole('user') && (
                  <button 
                    onClick={() => navigate(`/events/${id}/menus/new/plan`)}
                    className="btn btn-primary"
                  >
                    Create First Menu
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="shopping-section">
            <SmartShoppingList eventId={id} />
          </div>
        )}
      </div>
    </div>
  );
}