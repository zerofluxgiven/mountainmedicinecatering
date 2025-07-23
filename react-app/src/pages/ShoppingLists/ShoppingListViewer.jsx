import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { generateShoppingListFromObjectPDF } from '../../services/pdfService';
import './ShoppingListViewer.css';

export default function ShoppingListViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grouped'); // grouped or checklist
  const [hideChecked, setHideChecked] = useState(false);

  useEffect(() => {
    loadShoppingList();
  }, [id]);

  const loadShoppingList = async () => {
    try {
      setLoading(true);
      const listDoc = await getDoc(doc(db, 'shopping_lists', id));
      
      if (!listDoc.exists()) {
        setError('Shopping list not found');
        return;
      }

      setShoppingList({
        id: listDoc.id,
        ...listDoc.data()
      });
    } catch (err) {
      console.error('Error loading shopping list:', err);
      setError('Failed to load shopping list');
    } finally {
      setLoading(false);
    }
  };

  const handleItemCheck = async (itemIndex) => {
    const updatedItems = [...shoppingList.items];
    updatedItems[itemIndex].checked = !updatedItems[itemIndex].checked;
    
    // Update local state
    setShoppingList(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'shopping_lists', id), {
        items: updatedItems,
        updated_at: new Date()
      });
    } catch (error) {
      console.error('Error updating item:', error);
      // Revert on error
      loadShoppingList();
    }
  };

  const handleMarkComplete = async () => {
    try {
      await updateDoc(doc(db, 'shopping_lists', id), {
        status: 'completed',
        completed_at: new Date()
      });
      setShoppingList(prev => ({
        ...prev,
        status: 'completed'
      }));
    } catch (error) {
      console.error('Error marking complete:', error);
      alert('Failed to mark as complete');
    }
  };

  const handleExportPDF = async () => {
    try {
      await generateShoppingListFromObjectPDF(shoppingList);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = formatShoppingListText();
    
    if (navigator.share) {
      navigator.share({
        title: shoppingList.name,
        text: text
      }).catch(console.error);
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(text).then(() => {
        alert('Shopping list copied to clipboard!');
      }).catch(console.error);
    }
  };

  const formatShoppingListText = () => {
    let text = `${shoppingList.name}\n`;
    if (shoppingList.event_name) {
      text += `Event: ${shoppingList.event_name}\n`;
    }
    text += `\n`;

    const groups = groupItems();
    Object.entries(groups).forEach(([groupName, items]) => {
      text += `${groupName}:\n`;
      items.forEach(item => {
        const check = item.checked ? '✓' : '○';
        text += `${check} ${item.quantity || ''} ${item.unit || ''} ${item.name}\n`;
      });
      text += `\n`;
    });

    return text;
  };

  const groupItems = () => {
    if (!shoppingList.items) return {};
    
    const filtered = hideChecked 
      ? shoppingList.items.filter(item => !item.checked)
      : shoppingList.items;

    if (shoppingList.group_by === 'none' || viewMode === 'checklist') {
      return { 'All Items': filtered };
    }

    return filtered.reduce((groups, item) => {
      const key = item[shoppingList.group_by] || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  };

  const getProgress = () => {
    if (!shoppingList.items || shoppingList.items.length === 0) return 0;
    const checked = shoppingList.items.filter(item => item.checked).length;
    return Math.round((checked / shoppingList.items.length) * 100);
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

  const progress = getProgress();
  const groups = groupItems();

  return (
    <div className="shopping-list-viewer">
      <div className="viewer-header">
        <div className="header-info">
          <h1>{shoppingList.name}</h1>
          {shoppingList.event_name && (
            <p className="event-name">For: {shoppingList.event_name}</p>
          )}
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
            <span className="progress-text">{progress}% Complete</span>
          </div>
        </div>

        <div className="header-actions">
          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              onClick={() => setViewMode('grouped')}
            >
              Grouped
            </button>
            <button
              className={`view-btn ${viewMode === 'checklist' ? 'active' : ''}`}
              onClick={() => setViewMode('checklist')}
            >
              Checklist
            </button>
          </div>

          <label className="hide-checked">
            <input
              type="checkbox"
              checked={hideChecked}
              onChange={(e) => setHideChecked(e.target.checked)}
            />
            Hide checked items
          </label>

          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={handlePrint}>
              🖨️ Print
            </button>
            <button className="btn btn-secondary" onClick={handleExportPDF}>
              📄 PDF
            </button>
            <button className="btn btn-secondary" onClick={handleShare}>
              📤 Share
            </button>
            {hasRole('user') && (
              <Link to={`/shopping-lists/${id}/edit`} className="btn btn-primary">
                ✏️ Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="list-content">
        {shoppingList.notes && (
          <div className="list-notes">
            <h3>Notes</h3>
            <p>{shoppingList.notes}</p>
          </div>
        )}

        <div className="items-container">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className="item-group">
              {viewMode === 'grouped' && shoppingList.group_by !== 'none' && (
                <h3 className="group-header">{groupName}</h3>
              )}
              
              <div className="items-list">
                {items.map((item, index) => (
                  <div 
                    key={item.id || index} 
                    className={`item ${item.checked ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked || false}
                      onChange={() => handleItemCheck(shoppingList.items.indexOf(item))}
                      className="item-checkbox"
                    />
                    <span className="item-details">
                      <span className="item-quantity">
                        {item.quantity} {item.unit}
                      </span>
                      <span className="item-name">{item.name}</span>
                      {item.notes && (
                        <span className="item-notes">({item.notes})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {shoppingList.status !== 'completed' && progress === 100 && (
          <div className="completion-prompt">
            <p>All items checked! Ready to mark this list as complete?</p>
            <button 
              className="btn btn-primary"
              onClick={handleMarkComplete}
            >
              Mark as Complete
            </button>
          </div>
        )}

        {shoppingList.status === 'completed' && (
          <div className="completed-badge">
            ✅ Shopping Complete!
          </div>
        )}
      </div>
    </div>
  );
}