import React, { useState, useRef } from 'react';
import './FileUpload.css';

export default function FileUpload({ onFileSelect, accept, multiple = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
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
    if (multiple) {
      setSelectedFiles(files);
      onFileSelect(files);
    } else {
      const file = files[0];
      if (file) {
        setSelectedFiles([file]);
        onFileSelect(file);
      }
    }
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    if (multiple) {
      onFileSelect(newFiles);
    } else if (newFiles.length === 0) {
      onFileSelect(null);
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

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-item">
              <span className="file-icon">📄</span>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                className="remove-file"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}