import React from 'react';
import './PermissionError.css';

export default function PermissionError({ error, onDismiss }) {
  // Check if this is a permission-related error
  const isPermissionError = error?.message && (
    error.message.includes('403') ||
    error.message.includes('CORS') ||
    error.message.includes('permission') ||
    error.message.includes('unauthorized') ||
    error.message.includes('unauthenticated')
  );

  if (!isPermissionError) return null;

  return (
    <div className="permission-error-banner">
      <div className="permission-error-content">
        <h3>🚨 Permission Issue Detected</h3>
        <p className="error-message">{error.message}</p>
        
        <div className="permission-help">
          <h4>Dan, you need to:</h4>
          <ol>
            <li>Check <code>MANUAL_PERMISSIONS_GUIDE.md</code> for the solution</li>
            <li>Look for the specific error type in the guide</li>
            <li>Follow the manual steps listed there</li>
            <li>Ask Claude: "Is this a permissions issue?" for help</li>
          </ol>
          
          <p className="error-note">
            <strong>Note:</strong> Claude cannot fix permission issues directly. 
            You must make changes in Firebase Console or run gcloud commands.
          </p>
        </div>
        
        {onDismiss && (
          <button onClick={onDismiss} className="dismiss-btn">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}