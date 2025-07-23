import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import './ShoppingListList.css';

export default function ShoppingListList() {
  const { currentUser, hasRole } = useAuth();
  const [shoppingLists, setShoppingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, completed

  useEffect(() => {
    if (!currentUser) return;

    // Query shopping lists
    const q = query(
      collection(db, 'shopping_lists'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShoppingLists(lists);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleDelete = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this shopping list?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'shopping_lists', listId));
    } catch (error) {
      console.error('Error deleting shopping list:', error);
      alert('Failed to delete shopping list');
    }
  };

  const filteredLists = shoppingLists.filter(list => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return list.status === 'active';
    if (filterStatus === 'completed') return list.status === 'completed';
    return true;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="status-badge active">Active</span>;
      case 'completed':
        return <span className="status-badge completed">Completed</span>;
      case 'draft':
        return <span className="status-badge draft">Draft</span>;
      default:
        return <span className="status-badge">{status || 'Unknown'}</span>;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading shopping lists...</p>
      </div>
    );
  }

  return (
    <div className="shopping-list-page">
      <div className="page-header">
        <h1>Shopping Lists</h1>
        <Link to="/shopping-lists/new" className="btn btn-primary">
          + New Shopping List
        </Link>
      </div>

      <div className="filters">
        <button 
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({shoppingLists.length})
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
          onClick={() => setFilterStatus('active')}
        >
          Active ({shoppingLists.filter(l => l.status === 'active').length})
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterStatus('completed')}
        >
          Completed ({shoppingLists.filter(l => l.status === 'completed').length})
        </button>
      </div>

      {filteredLists.length === 0 ? (
        <div className="empty-state">
          <h2>No shopping lists found</h2>
          <p>Create your first shopping list to get started.</p>
          <Link to="/shopping-lists/new" className="btn btn-primary">
            Create Shopping List
          </Link>
        </div>
      ) : (
        <div className="shopping-lists-grid">
          {filteredLists.map(list => (
            <div key={list.id} className="shopping-list-card">
              <div className="list-header">
                <h3>{list.name || 'Unnamed List'}</h3>
                {getStatusBadge(list.status)}
              </div>
              
              <div className="list-details">
                {list.event_name && (
                  <p className="event-name">
                    <span className="icon">📅</span>
                    {list.event_name}
                  </p>
                )}
                
                <p className="date">
                  <span className="icon">📆</span>
                  Created: {formatDate(list.created_at)}
                </p>
                
                {list.items && (
                  <p className="item-count">
                    <span className="icon">📦</span>
                    {list.items.length} items
                    {list.items.filter(item => item.checked).length > 0 && 
                      ` (${list.items.filter(item => item.checked).length} checked)`
                    }
                  </p>
                )}

                {list.total_cost && (
                  <p className="total-cost">
                    <span className="icon">💰</span>
                    Estimated: ${list.total_cost.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="list-actions">
                <Link 
                  to={`/shopping-lists/${list.id}`} 
                  className="btn btn-secondary"
                >
                  View
                </Link>
                <Link 
                  to={`/shopping-lists/${list.id}/edit`} 
                  className="btn btn-secondary"
                >
                  Edit
                </Link>
                {hasRole('admin') && (
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(list.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}