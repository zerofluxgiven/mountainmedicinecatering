import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import MenuItem from './MenuItem';
import './MenuSection.css';

export default function MenuSection({ 
  section, 
  onUpdate, 
  onRemove, 
  onAddItem, 
  onRemoveItem 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleNameChange = (e) => {
    onUpdate({ name: e.target.value });
  };

  const handleItemReorder = (activeId, overId) => {
    const oldIndex = section.items.findIndex(item => item.id === activeId);
    const newIndex = section.items.findIndex(item => item.id === overId);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = [...section.items];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);
      onUpdate({ items: newItems });
    }
  };

  const updateItem = (itemId, updates) => {
    const newItems = section.items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    onUpdate({ items: newItems });
  };

  return (
    <div ref={setNodeRef} style={style} className="menu-section">
      <div className="section-header">
        <div className="drag-handle" {...attributes} {...listeners}>
          ⋮⋮
        </div>
        
        <input
          type="text"
          value={section.name}
          onChange={handleNameChange}
          className="section-name-input"
          placeholder="Section name"
        />
        
        <div className="section-actions">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onAddItem}
          >
            + Add Item
          </button>
          
          <button
            type="button"
            className="remove-section-btn"
            onClick={onRemove}
            title="Remove section"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="section-items">
        {section.items.length > 0 ? (
          <SortableContext
            items={section.items.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {section.items.map((item) => (
              <MenuItem
                key={item.id}
                item={item}
                onUpdate={(updates) => updateItem(item.id, updates)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="empty-items">
            <p>No items in this section</p>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={onAddItem}
            >
              Add First Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}