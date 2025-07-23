import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { generateShoppingList } from '../../services/shoppingIntelligence';
import './ShoppingListEditor.css';

export default function ShoppingListEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isNew = !id;

  const [formData, setFormData] = useState({
    name: '',
    event_id: '',
    event_name: '',
    status: 'active',
    items: [],
    notes: '',
    group_by: 'category',
    include_prices: false,
    include_stores: false
  });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
    if (!isNew) {
      loadShoppingList();
    }
  }, [id, isNew]);

  const loadEvents = async () => {
    try {
      const eventsQuery = query(
        collection(db, 'events'),
        where('start_date', '>=', new Date())
      );
      const snapshot = await getDocs(eventsQuery);
      const eventsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsList);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadShoppingList = async () => {
    try {
      setLoading(true);
      const listDoc = await getDoc(doc(db, 'shopping_lists', id));
      
      if (!listDoc.exists()) {
        setError('Shopping list not found');
        return;
      }

      const data = listDoc.data();
      setFormData({
        name: data.name || '',
        event_id: data.event_id || '',
        event_name: data.event_name || '',
        status: data.status || 'active',
        items: data.items || [],
        notes: data.notes || '',
        group_by: data.group_by || 'category',
        include_prices: data.include_prices || false,
        include_stores: data.include_stores || false
      });
    } catch (err) {
      console.error('Error loading shopping list:', err);
      setError('Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromEvent = async () => {
    if (!formData.event_id) {
      alert('Please select an event first');
      return;
    }

    try {
      setGenerating(true);
      const result = await generateShoppingList(formData.event_id, {
        groupBy: formData.group_by,
        includePrices: formData.include_prices,
        includeStores: formData.include_stores
      });

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          items: result.items,
          name: formData.name || `Shopping List for ${formData.event_name}`
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Failed to generate shopping list: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        id: `item_${Date.now()}`,
        name: '',
        quantity: '',
        unit: '',
        category: 'Other',
        notes: '',
        checked: false
      }]
    }));
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a name for the shopping list');
      return;
    }

    try {
      setSaving(true);
      
      const listData = {
        ...formData,
        updated_at: serverTimestamp()
      };

      if (isNew) {
        listData.created_at = serverTimestamp();
        listData.created_by = currentUser.uid;
        
        const newId = doc(collection(db, 'shopping_lists')).id;
        await setDoc(doc(db, 'shopping_lists', newId), listData);
        navigate(`/shopping-lists/${newId}`);
      } else {
        await updateDoc(doc(db, 'shopping_lists', id), listData);
        navigate(`/shopping-lists/${id}`);
      }
    } catch (error) {
      console.error('Error saving shopping list:', error);
      alert('Failed to save shopping list');
    } finally {
      setSaving(false);
    }
  };

  const handleEventChange = (eventId) => {
    const selectedEvent = events.find(e => e.id === eventId);
    setFormData(prev => ({
      ...prev,
      event_id: eventId,
      event_name: selectedEvent ? selectedEvent.name : ''
    }));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading shopping list...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/shopping-lists')}>Back to Lists</button>
      </div>
    );
  }

  return (
    <div className="shopping-list-editor">
      <div className="page-header">
        <h1>{isNew ? 'Create Shopping List' : 'Edit Shopping List'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="shopping-list-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label htmlFor="name">List Name*</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Week 1 Groceries"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event">Event (Optional)</label>
            <select
              id="event"
              value={formData.event_id}
              onChange={(e) => handleEventChange(e.target.value)}
            >
              <option value="">Select an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} ({new Date(event.start_date.toDate()).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {formData.event_id && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGenerateFromEvent}
              disabled={generating}
            >
              {generating ? 'Generating...' : '🔄 Generate Items from Event'}
            </button>
          )}

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Any special notes or reminders..."
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Shopping List Options</h2>
          
          <div className="form-group">
            <label htmlFor="groupBy">Group Items By</label>
            <select
              id="groupBy"
              value={formData.group_by}
              onChange={(e) => setFormData(prev => ({ ...prev, group_by: e.target.value }))}
            >
              <option value="category">Category</option>
              <option value="store">Store</option>
              <option value="recipe">Recipe</option>
              <option value="none">No Grouping</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.include_prices}
                onChange={(e) => setFormData(prev => ({ ...prev, include_prices: e.target.checked }))}
              />
              Include price estimates
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.include_stores}
                onChange={(e) => setFormData(prev => ({ ...prev, include_stores: e.target.checked }))}
              />
              Include store recommendations
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h2>Items ({formData.items.length})</h2>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addItem}
            >
              + Add Item
            </button>
          </div>

          <div className="items-list">
            {formData.items.length === 0 ? (
              <p className="empty-message">No items yet. Add items manually or generate from an event.</p>
            ) : (
              formData.items.map((item, index) => (
                <div key={item.id || index} className="item-row">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => handleItemChange(index, 'checked', e.target.checked)}
                    className="item-checkbox"
                  />
                  
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    placeholder="Item name"
                    className="item-name"
                  />
                  
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="item-quantity"
                  />
                  
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="item-unit"
                  />
                  
                  <select
                    value={item.category}
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                    className="item-category"
                  >
                    <option value="Produce">Produce</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Meat">Meat</option>
                    <option value="Dry Goods">Dry Goods</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Other">Other</option>
                  </select>
                  
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeItem(index)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/shopping-lists')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : (isNew ? 'Create Shopping List' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
}