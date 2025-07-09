import React from 'react';
import './Loading.css';

export default function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2>Mountain Medicine Catering</h2>
        <p>Loading...</p>
      </div>
    </div>
  );
}