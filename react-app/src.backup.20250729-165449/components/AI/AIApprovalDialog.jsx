import React from 'react';
import './AIApprovalDialog.css';

export default function AIApprovalDialog({ action, onApprove, onReject }) {
  if (!action) return null;

  const renderActionDetails = () => {
    switch (action.type) {
      case 'create_recipe':
        return (
          <div className="action-details">
            <h3>Create New Recipe</h3>
            <div className="detail-section">
              <h4>Recipe Details:</h4>
              <ul>
                <li><strong>Name:</strong> {action.data.recipe.name}</li>
                <li><strong>Servings:</strong> {action.data.recipe.servings}</li>
                <li><strong>Ingredients:</strong> {action.data.recipe.ingredients?.length || 0} items</li>
                <li><strong>Instructions:</strong> {action.data.recipe.instructions?.length || 0} steps</li>
                {action.data.recipe.prep_time && <li><strong>Prep Time:</strong> {action.data.recipe.prep_time}</li>}
                {action.data.recipe.cook_time && <li><strong>Cook Time:</strong> {action.data.recipe.cook_time}</li>}
              </ul>
            </div>
            {action.data.source_url && (
              <div className="detail-section">
                <h4>Source:</h4>
                <p>{action.data.source_url}</p>
              </div>
            )}
          </div>
        );

      case 'update_recipe':
        return (
          <div className="action-details">
            <h3>Update Recipe</h3>
            <div className="detail-section">
              <h4>Recipe:</h4>
              <p>{action.data.recipeName} (ID: {action.data.recipeId})</p>
            </div>
            <div className="detail-section">
              <h4>Changes to be made:</h4>
              <ul>
                {Object.entries(action.data.updates).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {JSON.stringify(value)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'create_menu':
        return (
          <div className="action-details">
            <h3>Create New Menu</h3>
            <div className="detail-section">
              <h4>Event:</h4>
              <p>{action.data.eventName}</p>
            </div>
            <div className="detail-section">
              <h4>Menu Structure:</h4>
              <ul>
                <li><strong>Days:</strong> {action.data.menuData.days?.length || 0}</li>
                <li><strong>Total Meals:</strong> {action.data.totalMeals}</li>
                <li><strong>Type:</strong> {action.data.menuData.type || 'primary'}</li>
              </ul>
            </div>
          </div>
        );

      case 'add_recipe_to_menu':
        return (
          <div className="action-details">
            <h3>Add Recipe to Menu</h3>
            <div className="detail-section">
              <h4>Recipe:</h4>
              <p>{action.data.recipeName}</p>
            </div>
            <div className="detail-section">
              <h4>Add to:</h4>
              <ul>
                <li><strong>Menu:</strong> {action.data.menuName}</li>
                <li><strong>Day:</strong> {action.data.dayLabel}</li>
                <li><strong>Meal:</strong> {action.data.mealType}</li>
                <li><strong>Servings:</strong> {action.data.servings}</li>
              </ul>
            </div>
          </div>
        );

      case 'scale_recipe':
        return (
          <div className="action-details">
            <h3>Scale Recipe</h3>
            <div className="detail-section">
              <h4>Recipe:</h4>
              <p>{action.data.recipeName}</p>
            </div>
            <div className="detail-section">
              <h4>Scaling:</h4>
              <ul>
                <li><strong>Original Servings:</strong> {action.data.originalServings}</li>
                <li><strong>New Servings:</strong> {action.data.newServings}</li>
                <li><strong>Scale Factor:</strong> {action.data.scaleFactor}x</li>
              </ul>
            </div>
            <div className="detail-section">
              <h4>Scaled Ingredients:</h4>
              <ul className="ingredient-list">
                {action.data.scaledIngredients?.map((ing, idx) => (
                  <li key={idx}>
                    {ing.scaledAmount} {ing.unit} {ing.item}
                    <span className="original"> (was: {ing.originalAmount} {ing.unit})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'create_event':
        return (
          <div className="action-details">
            <h3>Create New Event</h3>
            <div className="detail-section">
              <h4>Event Details:</h4>
              <ul>
                <li><strong>Name:</strong> {action.data.event.name}</li>
                <li><strong>Start Date:</strong> {new Date(action.data.event.start_date).toLocaleDateString()}</li>
                <li><strong>End Date:</strong> {new Date(action.data.event.end_date).toLocaleDateString()}</li>
                <li><strong>Location:</strong> {action.data.event.location}</li>
                <li><strong>Guest Count:</strong> {action.data.event.guest_count}</li>
              </ul>
            </div>
            {action.data.event.notes && (
              <div className="detail-section">
                <h4>Notes:</h4>
                <p>{action.data.event.notes}</p>
              </div>
            )}
          </div>
        );

      case 'generate_shopping_list':
        return (
          <div className="action-details">
            <h3>Generate Shopping List</h3>
            <div className="detail-section">
              <h4>For Event:</h4>
              <p>{action.data.eventName}</p>
            </div>
            <div className="detail-section">
              <h4>Options:</h4>
              <ul>
                <li><strong>Group By:</strong> {action.data.groupBy}</li>
                <li><strong>Include Recipes:</strong> {action.data.recipeCount} recipes</li>
                <li><strong>Format:</strong> {action.data.format || 'PDF'}</li>
              </ul>
            </div>
          </div>
        );

      case 'export_pdf':
        return (
          <div className="action-details">
            <h3>Export PDF</h3>
            <div className="detail-section">
              <h4>Document Type:</h4>
              <p>{action.data.documentType}</p>
            </div>
            <div className="detail-section">
              <h4>Content:</h4>
              <p>{action.data.contentDescription}</p>
            </div>
          </div>
        );

      case 'manage_allergies':
        return (
          <div className="action-details">
            <h3>Manage Allergies</h3>
            <div className="detail-section">
              <h4>Event:</h4>
              <p>{action.data.eventName}</p>
            </div>
            <div className="detail-section">
              <h4>Changes:</h4>
              <ul>
                {action.data.add && (
                  <li><strong>Add:</strong> {action.data.add.join(', ')}</li>
                )}
                {action.data.remove && (
                  <li><strong>Remove:</strong> {action.data.remove.join(', ')}</li>
                )}
              </ul>
            </div>
          </div>
        );

      case 'batch_operation':
        return (
          <div className="action-details">
            <h3>Batch Operation</h3>
            <div className="detail-section">
              <h4>Operations to perform:</h4>
              <ol>
                {action.data.operations.map((op, idx) => (
                  <li key={idx}>
                    <strong>{op.type}:</strong> {op.description}
                  </li>
                ))}
              </ol>
            </div>
            <div className="warning-section">
              <p>⚠️ This will perform {action.data.operations.length} operations</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="action-details">
            <h3>{action.type}</h3>
            <pre>{JSON.stringify(action.data, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <div className="ai-approval-overlay">
      <div className="ai-approval-dialog">
        <div className="dialog-header">
          <h2>🤖 AI Action Approval Required</h2>
          <p className="ai-message">{action.aiMessage}</p>
        </div>

        <div className="dialog-content">
          {renderActionDetails()}
        </div>

        <div className="dialog-footer">
          <button className="approve-btn" onClick={onApprove}>
            ✅ Approve & Save
          </button>
          <button className="reject-btn" onClick={onReject}>
            ❌ Cancel
          </button>
          {action.type === 'create_recipe' && (
            <button className="modify-btn" onClick={() => onReject('edit')}>
              ✏️ Edit this recipe
            </button>
          )}
        </div>
      </div>
    </div>
  );
}