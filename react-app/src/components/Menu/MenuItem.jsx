import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './MenuItem.css';

export default function MenuItem({ item, onUpdate, onRemove }) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [serves, setServes] = useState(item.serves || 0);
  
  // Update serves when item changes (for auto-scaling)
  useEffect(() => {
    setServes(item.serves || 0);
  }, [item.serves]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const saveChanges = () => {
    onUpdate({ notes, serves: parseInt(serves) || 0 });
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setNotes(item.notes || '');
    setServes(item.serves || 0);
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="menu-item">
      <div className="item-main">
        <div className="drag-handle" {...attributes} {...listeners}>
          ⋮⋮
        </div>
        
        <div className="item-content">
          <div className="item-header">
            <h4 className="item-name">{item.recipe_name}</h4>
            {!isEditing ? (
              <span className="item-serves">Serves {item.serves || '?'}</span>
            ) : (
              <div className="serves-editor">
                <label>Serves:</label>
                <input
                  type="number"
                  value={serves}
                  onChange={(e) => setServes(e.target.value)}
                  min="1"
                  className="serves-input"
                />
              </div>
            )}
          </div>
          
          {item.notes && !isEditing && (
            <p className="item-notes">{item.notes}</p>
          )}
          
          {isEditing && (
            <div className="notes-editor">
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Add notes about this item..."
                rows="2"
                autoFocus
              />
              <div className="notes-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={saveChanges}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="item-actions">
          {!isEditing && (
            <button
              type="button"
              className="action-btn"
              onClick={() => setIsEditing(true)}
              title="Edit notes"
            >
              ✏️
            </button>
          )}
          
          <button
            type="button"
            className="action-btn remove"
            onClick={onRemove}
            title="Remove item"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}