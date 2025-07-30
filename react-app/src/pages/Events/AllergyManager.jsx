import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AllergyForm from '../../components/Allergy/AllergyForm';
import AllergyList from '../../components/Allergy/AllergyList';
import DietForm from '../../components/Diet/DietForm';
import DietList from '../../components/Diet/DietList';
import './AllergyManager.css';

export default function AllergyManager() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [diets, setDiets] = useState([]);
  const [eventMenus, setEventMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [showDietForm, setShowDietForm] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState(null);
  const [editingDiet, setEditingDiet] = useState(null);
  const [updatingEvent, setUpdatingEvent] = useState(false);

  useEffect(() => {
    loadEvent();
    const unsubscribe = subscribeToAllergies();
    const unsubscribeDiets = subscribeToDiets();
    const unsubscribeMenus = subscribeToEventMenus();
    return () => {
      unsubscribe();
      unsubscribeDiets();
      unsubscribeMenus();
    };
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

  const subscribeToDiets = () => {
    console.log('Setting up diet subscription for event:', eventId);
    const q = query(collection(db, 'events', eventId, 'diets'));
    
    return onSnapshot(q,
      (snapshot) => {
        console.log('Diet snapshot received, count:', snapshot.docs.length);
        const dietData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Diet data:', dietData);
        setDiets(dietData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching diets:', error);
        setLoading(false);
      }
    );
  };

  const subscribeToEventMenus = () => {
    const q = query(
      collection(db, 'menu_items'),
      where('event_id', '==', eventId)
    );
    
    return onSnapshot(q,
      (snapshot) => {
        const menusData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEventMenus(menusData);
      },
      (error) => {
        console.error('Error fetching event menus:', error);
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
      setShowAllergyForm(false);
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

  const handleAddDiet = async (dietData) => {
    try {
      console.log('Adding diet with data:', dietData);
      console.log('Event ID:', eventId);
      
      // Ensure we have valid data
      const dietToSave = {
        guest_name: dietData.guest_name || '',
        diet_types: dietData.diet_types || [],
        custom_diet_names: dietData.custom_diet_names || [],
        diet_name: dietData.diet_name || '',
        restrictions: dietData.restrictions || [],
        notes: dietData.notes || '',
        sub_menu_id: dietData.sub_menu_id || null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      
      console.log('Saving diet:', dietToSave);
      
      const docRef = await addDoc(collection(db, 'events', eventId, 'diets'), dietToSave);
      console.log('Diet saved with ID:', docRef.id);
      
      // Force a refresh of the diet list by reading it directly
      // This ensures immediate UI update while waiting for the snapshot
      const dietsSnapshot = await getDocs(collection(db, 'events', eventId, 'diets'));
      const updatedDiets = dietsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDiets(updatedDiets);
      
      setShowDietForm(false);
      // The onSnapshot listener will maintain real-time updates after this
    } catch (err) {
      console.error('Error adding diet - Full error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      alert(`Failed to add diet: ${err.message}`);
    }
  };

  const handleUpdateDiet = async (dietId, updates) => {
    try {
      await updateDoc(doc(db, 'events', eventId, 'diets', dietId), {
        ...updates,
        updated_at: serverTimestamp()
      });
      setEditingDiet(null);
      setShowDietForm(false);
    } catch (err) {
      console.error('Error updating diet:', err);
      alert('Failed to update diet');
    }
  };

  const handleDeleteDiet = async (dietId) => {
    if (!window.confirm('Are you sure you want to delete this diet record?')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'events', eventId, 'diets', dietId));
    } catch (err) {
      console.error('Error deleting diet:', err);
      alert('Failed to delete diet');
    }
  };

  const handleEditAllergy = (allergy) => {
    setEditingAllergy(allergy);
    setShowAllergyForm(true);
  };

  const handleEditDiet = (diet) => {
    setEditingDiet(diet);
    setShowDietForm(true);
  };

  const handleCancelAllergyForm = () => {
    setShowAllergyForm(false);
    setEditingAllergy(null);
  };

  const handleCancelDietForm = () => {
    setShowDietForm(false);
    setEditingDiet(null);
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
          
          <h1>Allergies & Dietary Restrictions</h1>
          <p className="event-name">{event?.name}</p>
          
          {hasRole('user') && !showAllergyForm && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowAllergyForm(true)}
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

      {/* Add/Edit Allergy Form */}
      {showAllergyForm && (
        <div className="form-section">
          <h2>{editingAllergy ? 'Edit Allergy' : 'Add New Allergy'}</h2>
          <AllergyForm
            allergy={editingAllergy}
            eventMenus={eventMenus}
            onSubmit={editingAllergy 
              ? (data) => handleUpdateAllergy(editingAllergy.id, data)
              : handleAddAllergy
            }
            onCancel={handleCancelAllergyForm}
          />
        </div>
      )}

      {/* Allergy List */}
      <div className="allergy-list-section">
        <h2>Individual Allergies</h2>
        {allergies.length > 0 ? (
          <AllergyList
            allergies={allergies}
            eventMenus={eventMenus}
            onEdit={hasRole('user') ? handleEditAllergy : null}
            onDelete={hasRole('user') ? handleDeleteAllergy : null}
          />
        ) : (
          <div className="empty-state">
            <p>No allergies recorded yet.</p>
            {hasRole('user') && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowAllergyForm(true)}
              >
                Add First Allergy
              </button>
            )}
          </div>
        )}
      </div>

      {/* Special Diets Section */}
      <div className="diet-section">
        <div className="section-header">
          <h2>Special Diets</h2>
          {hasRole('user') && !showDietForm && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowDietForm(true)}
            >
              <span className="btn-icon">➕</span>
              Add Diet
            </button>
          )}
        </div>

        {/* Add/Edit Diet Form */}
        {showDietForm && (
          <div className="form-section">
            <h3>{editingDiet ? 'Edit Diet' : 'Add New Diet'}</h3>
            <DietForm
              diet={editingDiet}
              onSubmit={editingDiet 
                ? (data) => handleUpdateDiet(editingDiet.id, data)
                : handleAddDiet
              }
              onCancel={handleCancelDietForm}
            />
          </div>
        )}

        {/* Diet List */}
        {diets.length > 0 ? (
          <DietList
            diets={diets}
            onEdit={hasRole('user') ? handleEditDiet : null}
            onDelete={hasRole('user') ? handleDeleteDiet : null}
          />
        ) : (
          <div className="empty-state">
            <p>No special diets recorded yet.</p>
            {hasRole('user') && !showDietForm && (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDietForm(true)}
              >
                Add First Diet
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}