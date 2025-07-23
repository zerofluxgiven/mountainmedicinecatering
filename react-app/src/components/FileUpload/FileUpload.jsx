import React, { useState, useRef } from 'react';
import './FileUpload.css';

export default function FileUpload({ onFileSelect, accept, multiple = false, fileQueue = [], processingStatus = {}, onRemoveFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    // Just pass files to parent, don't manage state here
    if (multiple) {
      onFileSelect(files);
    } else {
      const file = files[0];
      if (file) {
        onFileSelect(file);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'done':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'done':
        return 'status-done';
      case 'error':
        return 'status-error';
      default:
        return '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload">
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={accept}
          multiple={multiple}
          style={{ display: 'none' }}
        />
        
        <div className="upload-icon">📁</div>
        <p className="upload-text">
          Drag and drop files here, or click to browse
        </p>
        <p className="upload-hint">
          {accept ? `Accepted formats: ${accept}` : 'All file types accepted'}
        </p>
      </div>

      {fileQueue.length > 0 && (
        <div className="selected-files">
          <h4>Files:</h4>
          {fileQueue.map((fileEntry) => {
            const status = processingStatus[fileEntry.id]?.status || 'pending';
            const error = processingStatus[fileEntry.id]?.error;
            
            return (
              <div key={fileEntry.id} className="file-item">
                <span className="file-icon">📄</span>
                <div className="file-info">
                  <span className="file-name">{fileEntry.name}</span>
                  <span className="file-size">{formatFileSize(fileEntry.file.size)}</span>
                  <div className={`file-status ${getStatusClass(status)}`}>
                    <span className="status-icon">{getStatusIcon(status)}</span>
                    <span className="status-text">
                      {status === 'pending' && 'Waiting...'}
                      {status === 'processing' && 'Processing...'}
                      {status === 'done' && 'Done ✓'}
                      {status === 'error' && (error || 'Failed')}
                    </span>
                  </div>
                </div>
                {onRemoveFile && status !== 'processing' && (
                  <button
                    type="button"
                    className="remove-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(fileEntry.id);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}