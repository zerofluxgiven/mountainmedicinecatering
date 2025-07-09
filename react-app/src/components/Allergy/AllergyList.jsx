import React, { useState } from 'react';
import './AllergyList.css';

export default function AllergyList({ allergies, onEdit, onDelete }) {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const toggleExpand = (allergyId) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(allergyId)) {
        next.delete(allergyId);
      } else {
        next.add(allergyId);
      }
      return next;
    });
  };

  const filteredAllergies = allergies.filter(allergy => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nameMatch = allergy.guest_name?.toLowerCase().includes(search);
      const allergenMatch = allergy.allergens?.some(a => 
        a.toLowerCase().includes(search)
      );
      if (!nameMatch && !allergenMatch) return false;
    }

    // Severity filter
    if (filterSeverity !== 'all') {
      if (allergy.severity?.toLowerCase() !== filterSeverity) return false;
    }

    return true;
  });

  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return 'severity-severe';
      case 'moderate': return 'severity-moderate';
      case 'mild': return 'severity-mild';
      default: return 'severity-moderate';
    }
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
    <div className="allergy-list">
      {/* Filters */}
      <div className="list-filters">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by guest name or allergen..."
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

        <div className="severity-filter">
          <label>Filter by severity:</label>
          <select 
            value={filterSeverity} 
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All</option>
            <option value="severe">Severe</option>
            <option value="moderate">Moderate</option>
            <option value="mild">Mild</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="list-results">
        {filteredAllergies.length === 0 ? (
          <p className="no-results">No allergies match your filters.</p>
        ) : (
          <div className="allergy-items">
            {filteredAllergies.map(allergy => (
              <div 
                key={allergy.id} 
                className={`allergy-item ${getSeverityClass(allergy.severity)}`}
              >
                <div 
                  className="item-header"
                  onClick={() => toggleExpand(allergy.id)}
                >
                  <div className="header-main">
                    <h3 className="guest-name">{allergy.guest_name}</h3>
                    <span className={`severity-badge ${getSeverityClass(allergy.severity)}`}>
                      {allergy.severity || 'Moderate'}
                    </span>
                  </div>
                  
                  <div className="header-allergens">
                    {allergy.allergens?.slice(0, 3).map(allergen => (
                      <span key={allergen} className="allergen-chip">
                        {allergen}
                      </span>
                    ))}
                    {allergy.allergens?.length > 3 && (
                      <span className="allergen-chip more">
                        +{allergy.allergens.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <button className="expand-btn">
                    {expandedItems.has(allergy.id) ? '−' : '+'}
                  </button>
                </div>

                {expandedItems.has(allergy.id) && (
                  <div className="item-details">
                    <div className="detail-section">
                      <h4>All Allergens</h4>
                      <div className="allergen-list">
                        {allergy.allergens?.map(allergen => (
                          <span key={allergen} className="allergen-tag">
                            ⚠️ {allergen}
                          </span>
                        ))}
                      </div>
                    </div>

                    {allergy.dietary_restrictions && (
                      <div className="detail-section">
                        <h4>Other Dietary Restrictions</h4>
                        <p>{allergy.dietary_restrictions}</p>
                      </div>
                    )}

                    {(allergy.emergency_contact || allergy.emergency_phone) && (
                      <div className="detail-section">
                        <h4>Emergency Contact</h4>
                        <p>
                          {allergy.emergency_contact}
                          {allergy.emergency_phone && (
                            <> - <a href={`tel:${allergy.emergency_phone}`}>{allergy.emergency_phone}</a></>
                          )}
                        </p>
                      </div>
                    )}

                    {allergy.notes && (
                      <div className="detail-section">
                        <h4>Notes</h4>
                        <p>{allergy.notes}</p>
                      </div>
                    )}

                    <div className="detail-section">
                      <p className="meta-info">
                        Added {formatDate(allergy.created_at)}
                        {allergy.updated_at && allergy.updated_at !== allergy.created_at && (
                          <> • Updated {formatDate(allergy.updated_at)}</>
                        )}
                      </p>
                    </div>

                    {(onEdit || onDelete) && (
                      <div className="item-actions">
                        {onEdit && (
                          <button 
                            className="btn btn-secondary"
                            onClick={() => onEdit(allergy)}
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            className="btn btn-danger"
                            onClick={() => onDelete(allergy.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}