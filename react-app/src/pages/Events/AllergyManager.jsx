import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AllergyForm from '../../components/Allergy/AllergyForm';
import AllergyList from '../../components/Allergy/AllergyList';
import './AllergyManager.css';

export default function AllergyManager() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState(null);
  const [updatingEvent, setUpdatingEvent] = useState(false);

  useEffect(() => {
    loadEvent();
    const unsubscribe = subscribeToAllergies();
    return () => unsubscribe();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        setError('Event not found');
        return;
      }
      setEvent({ id: eventDoc.id, ...eventDoc.data() });
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event');
    }
  };

  const subscribeToAllergies = () => {
    const q = query(collection(db, 'events', eventId, 'allergies'));
    
    return onSnapshot(q, 
      (snapshot) => {
        const allergyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllergies(allergyData);
        setLoading(false);
        
        // Update event allergens array
        updateEventAllergens(allergyData);
      },
      (error) => {
        console.error('Error fetching allergies:', error);
        setLoading(false);
      }
    );
  };

  const updateEventAllergens = async (allergyList) => {
    // Aggregate all unique allergens
    const allergenSet = new Set();
    allergyList.forEach(allergy => {
      allergy.allergens?.forEach(allergen => allergenSet.add(allergen));
    });
    
    const allergenArray = Array.from(allergenSet).sort();
    
    // Update event document if allergens changed
    if (event && JSON.stringify(event.allergens) !== JSON.stringify(allergenArray)) {
      try {
        setUpdatingEvent(true);
        await updateDoc(doc(db, 'events', eventId), {
          allergens: allergenArray,
          updated_at: serverTimestamp()
        });
        setEvent(prev => ({ ...prev, allergens: allergenArray }));
      } catch (err) {
        console.error('Error updating event allergens:', err);
      } finally {
        setUpdatingEvent(false);
      }
    }
  };

  const handleAddAllergy = async (allergyData) => {
    try {
      await addDoc(collection(db, 'events', eventId, 'allergies'), {
        ...allergyData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      setShowForm(false);
    } catch (err) {
      console.error('Error adding allergy:', err);
      alert('Failed to add allergy');
    }
  };

  const handleUpdateAllergy = async (allergyId, updates) => {
    try {
      await updateDoc(doc(db, 'events', eventId, 'allergies', allergyId), {
        ...updates,
        updated_at: serverTimestamp()
      });
      setEditingAllergy(null);
    } catch (err) {
      console.error('Error updating allergy:', err);
      alert('Failed to update allergy');
    }
  };

  const handleDeleteAllergy = async (allergyId) => {
    if (!window.confirm('Are you sure you want to delete this allergy record?')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'events', eventId, 'allergies', allergyId));
    } catch (err) {
      console.error('Error deleting allergy:', err);
      alert('Failed to delete allergy');
    }
  };

  const handleEdit = (allergy) => {
    setEditingAllergy(allergy);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAllergy(null);
  };

  const getSeverityStats = () => {
    const stats = {
      severe: 0,
      moderate: 0,
      mild: 0
    };
    
    allergies.forEach(allergy => {
      const severity = allergy.severity?.toLowerCase() || 'moderate';
      if (stats[severity] !== undefined) {
        stats[severity]++;
      }
    });
    
    return stats;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading allergies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to={`/events/${eventId}`} className="btn btn-secondary">
          Back to Event
        </Link>
      </div>
    );
  }

  const severityStats = getSeverityStats();

  return (
    <div className="allergy-manager">
      {/* Header */}
      <div className="allergy-header">
        <div className="header-content">
          <Link to={`/events/${eventId}`} className="back-link">
            ← Back to Event
          </Link>
          
          <h1>Allergy Management</h1>
          <p className="event-name">{event?.name}</p>
          
          {hasRole('user') && !showForm && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              <span className="btn-icon">➕</span>
              Add Allergy
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="allergy-stats">
        <div className="stat-card">
          <div className="stat-value">{allergies.length}</div>
          <div className="stat-label">Total Guests with Allergies</div>
        </div>
        
        <div className="stat-card severe">
          <div className="stat-value">{severityStats.severe}</div>
          <div className="stat-label">Severe Allergies</div>
        </div>
        
        <div className="stat-card moderate">
          <div className="stat-value">{severityStats.moderate}</div>
          <div className="stat-label">Moderate Allergies</div>
        </div>
        
        <div className="stat-card mild">
          <div className="stat-value">{severityStats.mild}</div>
          <div className="stat-label">Mild Allergies</div>
        </div>
      </div>

      {/* Allergen Summary */}
      {event?.allergens && event.allergens.length > 0 && (
        <div className="allergen-summary">
          <h2>All Allergens Present</h2>
          <div className="allergen-tags">
            {event.allergens.map(allergen => (
              <span key={allergen} className="allergen-tag large">
                ⚠️ {allergen}
              </span>
            ))}
          </div>
          {updatingEvent && (
            <p className="updating-note">Updating event allergens...</p>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="form-section">
          <h2>{editingAllergy ? 'Edit Allergy' : 'Add New Allergy'}</h2>
          <AllergyForm
            allergy={editingAllergy}
            onSubmit={editingAllergy 
              ? (data) => handleUpdateAllergy(editingAllergy.id, data)
              : handleAddAllergy
            }
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* Allergy List */}
      <div className="allergy-list-section">
        <h2>Individual Allergies</h2>
        {allergies.length > 0 ? (
          <AllergyList
            allergies={allergies}
            onEdit={hasRole('user') ? handleEdit : null}
            onDelete={hasRole('user') ? handleDeleteAllergy : null}
          />
        ) : (
          <div className="empty-state">
            <p>No allergies recorded yet.</p>
            {hasRole('user') && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                Add First Allergy
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}