import React, { useState } from 'react';
import './DietList.css';

export default function DietList({ diets, eventMenus, onEdit, onDelete }) {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDiet, setFilterDiet] = useState('all');

  const toggleExpand = (dietId) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(dietId)) {
        next.delete(dietId);
      } else {
        next.add(dietId);
      }
      return next;
    });
  };

  // Get unique diet types for filter
  const dietTypes = [...new Set(diets.map(d => d.diet_name || d.diet_type))].sort();

  const filteredDiets = diets.filter(diet => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nameMatch = diet.guest_name?.toLowerCase().includes(search);
      const dietMatch = (diet.diet_name || diet.diet_type)?.toLowerCase().includes(search);
      const restrictionMatch = diet.restrictions?.some(r => 
        r.toLowerCase().includes(search)
      );
      if (!nameMatch && !dietMatch && !restrictionMatch) return false;
    }

    // Diet type filter
    if (filterDiet !== 'all') {
      const dietName = diet.diet_name || diet.diet_type;
      if (dietName !== filterDiet) return false;
    }

    return true;
  });

  const getDietClass = (dietType) => {
    // Return a consistent class based on diet type
    if (dietType?.toLowerCase().includes('vegan')) return 'diet-vegan';
    if (dietType?.toLowerCase().includes('vegetarian')) return 'diet-vegetarian';
    if (dietType?.toLowerCase().includes('halal') || dietType?.toLowerCase().includes('kosher')) return 'diet-religious';
    if (dietType?.toLowerCase().includes('keto') || dietType?.toLowerCase().includes('paleo')) return 'diet-specialty';
    return 'diet-other';
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="diet-list">
      {/* Filters */}
      <div className="list-filters">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by guest name, diet, or restriction..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        {dietTypes.length > 0 && (
          <div className="diet-filter">
            <label>Filter by diet:</label>
            <select 
              value={filterDiet} 
              onChange={(e) => setFilterDiet(e.target.value)}
            >
              <option value="all">All Diets</option>
              {dietTypes.map(diet => (
                <option key={diet} value={diet}>{diet}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="list-results">
        {filteredDiets.length === 0 ? (
          <p className="no-results">No diets match your filters.</p>
        ) : (
          <div className="diet-items">
            {filteredDiets.map(diet => {
              const dietName = diet.diet_name || diet.diet_type;
              return (
                <div 
                  key={diet.id} 
                  className={`diet-item ${getDietClass(dietName)}`}
                >
                  <div 
                    className="item-header"
                    onClick={() => toggleExpand(diet.id)}
                  >
                    <div className="header-main">
                      <h3 className="guest-name">{diet.guest_name}</h3>
                      {/* Display diet badges */}
                      {diet.diet_types?.map(type => (
                        <span key={type} className={`diet-badge ${getDietClass(type)}`}>
                          {type}
                        </span>
                      ))}
                      {diet.custom_diet_names?.map(name => (
                        <span key={name} className="diet-badge custom">
                          {name}
                        </span>
                      ))}
                      {/* Fallback for old format */}
                      {!diet.diet_types && !diet.custom_diet_names && dietName && (
                        <span className={`diet-badge ${getDietClass(dietName)}`}>
                          {dietName}
                        </span>
                      )}
                    </div>
                    
                    <div className="header-restrictions">
                      {diet.restrictions?.slice(0, 2).map(restriction => (
                        <span key={restriction} className="restriction-chip">
                          {restriction}
                        </span>
                      ))}
                      {diet.restrictions?.length > 2 && (
                        <span className="restriction-chip more">
                          +{diet.restrictions.length - 2} more
                        </span>
                      )}
                    </div>
                    
                    <button className="expand-btn">
                      {expandedItems.has(diet.id) ? '−' : '+'}
                    </button>
                  </div>

                  {expandedItems.has(diet.id) && (
                    <div className="item-details">
                      <div className="detail-section">
                        <h4>Diet Types</h4>
                        {/* Display multiple diet types */}
                        {diet.diet_types && diet.diet_types.length > 0 && (
                          <div className="diet-type-list">
                            {diet.diet_types.map(type => (
                              <span key={type} className={`diet-type-tag ${getDietClass(type)}`}>
                                {type}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Display custom diets */}
                        {diet.custom_diet_names && diet.custom_diet_names.length > 0 && (
                          <div className="custom-diet-list">
                            {diet.custom_diet_names.map(name => (
                              <span key={name} className="diet-type-tag custom">
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Fallback for old data format */}
                        {!diet.diet_types && !diet.custom_diet_names && dietName && (
                          <p className={`diet-type ${getDietClass(dietName)}`}>
                            {dietName}
                          </p>
                        )}
                      </div>

                      {diet.restrictions && diet.restrictions.length > 0 && (
                        <div className="detail-section">
                          <h4>All Restrictions</h4>
                          <div className="restriction-list">
                            {diet.restrictions.map(restriction => (
                              <span key={restriction} className="restriction-tag">
                                📌 {restriction}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {diet.sub_menu_id && (
                        <div className="detail-section">
                          <h4>Special Menu Assignment</h4>
                          <p>
                            {(() => {
                              const menu = eventMenus?.find(m => m.id === diet.sub_menu_id);
                              return menu ? (
                                <span className="menu-assignment">
                                  {menu.name}
                                </span>
                              ) : (
                                <span className="menu-assignment unknown">Menu not found</span>
                              );
                            })()}
                          </p>
                        </div>
                      )}

                      {diet.notes && (
                        <div className="detail-section">
                          <h4>Notes</h4>
                          <p>{diet.notes}</p>
                        </div>
                      )}

                      <div className="detail-section">
                        <p className="meta-info">
                          Added {formatDate(diet.created_at)}
                          {diet.updated_at && diet.updated_at !== diet.created_at && (
                            <> • Updated {formatDate(diet.updated_at)}</>
                          )}
                        </p>
                      </div>

                      {(onEdit || onDelete) && (
                        <div className="item-actions">
                          {onEdit && (
                            <button 
                              className="btn btn-secondary"
                              onClick={() => onEdit(diet)}
                            >
                              Edit
                            </button>
                          )}
                          {onDelete && (
                            <button 
                              className="btn btn-danger"
                              onClick={() => onDelete(diet.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}