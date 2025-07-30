import React, { useState } from 'react';
import './FeatureTestReport.css';

/**
 * Visual Test Report Component
 * Provides an interactive checklist to verify all recent features
 */
export default function FeatureTestReport() {
  const [testResults, setTestResults] = useState({
    dietManagement: {
      multipleSelection: null,
      immediateUpdate: null,
      validation: null,
      firestoreIntegration: null,
      uiConsistency: null
    },
    mealTypeSettings: {
      adminOnly: null,
      listDisplay: null,
      customTypes: null,
      colorPersistence: null,
      selectionMaintained: null
    },
    colorPicker: {
      sliderSmooth: null,
      hexInput: null,
      preview: null,
      opacityControl: null,
      responsive: null
    },
    realTimeSync: {
      mealTypeSync: null,
      dietSync: null,
      multiWindow: null,
      noRefreshNeeded: null
    },
    overallUX: {
      loadingStates: null,
      errorHandling: null,
      consistency: null,
      mobileReady: null,
      performance: null
    }
  });

  const updateResult = (category, test, result) => {
    setTestResults(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [test]: result
      }
    }));
  };

  const getStatusIcon = (status) => {
    if (status === null) return '⚪';
    if (status === true) return '✅';
    return '❌';
  };

  const getOverallStatus = () => {
    let total = 0;
    let passed = 0;
    
    Object.values(testResults).forEach(category => {
      Object.values(category).forEach(result => {
        total++;
        if (result === true) passed++;
      });
    });
    
    return { total, passed, percentage: Math.round((passed / total) * 100) };
  };

  const categories = [
    {
      key: 'dietManagement',
      title: 'Diet Management',
      tests: [
        { key: 'multipleSelection', label: 'Multiple diet types can be selected' },
        { key: 'immediateUpdate', label: 'Diets appear immediately after save' },
        { key: 'validation', label: 'Form validation prevents empty submissions' },
        { key: 'firestoreIntegration', label: 'Data persists to Firestore correctly' },
        { key: 'uiConsistency', label: 'UI matches app design patterns' }
      ]
    },
    {
      key: 'mealTypeSettings',
      title: 'Meal Type Settings',
      tests: [
        { key: 'adminOnly', label: 'Only admins can access settings' },
        { key: 'listDisplay', label: 'Meal types display as list, not dropdown' },
        { key: 'customTypes', label: 'Custom meal types can be added' },
        { key: 'colorPersistence', label: 'Color changes persist after reload' },
        { key: 'selectionMaintained', label: 'Selection maintained during color changes' }
      ]
    },
    {
      key: 'colorPicker',
      title: 'Color Picker',
      tests: [
        { key: 'sliderSmooth', label: 'Sliders operate smoothly' },
        { key: 'hexInput', label: 'Hex input accepts and validates colors' },
        { key: 'preview', label: 'Color preview updates in real-time' },
        { key: 'opacityControl', label: 'Opacity slider works correctly' },
        { key: 'responsive', label: 'Component is mobile-responsive' }
      ]
    },
    {
      key: 'realTimeSync',
      title: 'Real-time Synchronization',
      tests: [
        { key: 'mealTypeSync', label: 'Meal type changes sync across instances' },
        { key: 'dietSync', label: 'Diet additions appear in other windows' },
        { key: 'multiWindow', label: 'Multi-window sync works reliably' },
        { key: 'noRefreshNeeded', label: 'No page refresh required for updates' }
      ]
    },
    {
      key: 'overallUX',
      title: 'Overall User Experience',
      tests: [
        { key: 'loadingStates', label: 'Loading states display appropriately' },
        { key: 'errorHandling', label: 'Errors are handled gracefully' },
        { key: 'consistency', label: 'UI is consistent with app style' },
        { key: 'mobileReady', label: 'Features work on mobile devices' },
        { key: 'performance', label: 'Performance is acceptable (<1s actions)' }
      ]
    }
  ];

  const overallStatus = getOverallStatus();

  return (
    <div className="feature-test-report">
      <h1>Feature Test Report</h1>
      <p className="report-subtitle">
        Comprehensive testing checklist for recent features
      </p>

      <div className="overall-progress">
        <div className="progress-stats">
          <span className="passed">{overallStatus.passed}</span>
          <span className="divider">/</span>
          <span className="total">{overallStatus.total}</span>
          <span className="percentage">({overallStatus.percentage}%)</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${overallStatus.percentage}%` }}
          />
        </div>
      </div>

      {categories.map(category => (
        <div key={category.key} className="test-category">
          <h2>{category.title}</h2>
          <div className="test-list">
            {category.tests.map(test => (
              <div key={test.key} className="test-item">
                <span className="test-label">{test.label}</span>
                <div className="test-actions">
                  <button
                    className={`test-btn ${testResults[category.key][test.key] === true ? 'pass' : ''}`}
                    onClick={() => updateResult(category.key, test.key, true)}
                  >
                    Pass
                  </button>
                  <button
                    className={`test-btn ${testResults[category.key][test.key] === false ? 'fail' : ''}`}
                    onClick={() => updateResult(category.key, test.key, false)}
                  >
                    Fail
                  </button>
                  <span className="status-icon">
                    {getStatusIcon(testResults[category.key][test.key])}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="test-notes">
        <h3>Testing Notes</h3>
        <textarea
          placeholder="Add any observations, issues, or suggestions here..."
          rows={6}
          className="notes-textarea"
        />
      </div>

      <div className="test-actions">
        <button 
          className="btn btn-primary"
          onClick={() => {
            const report = {
              timestamp: new Date().toISOString(),
              results: testResults,
              overall: overallStatus
            };
            console.log('Test Report:', report);
            alert('Test report logged to console');
          }}
        >
          Generate Report
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => window.location.reload()}
        >
          Reset Tests
        </button>
      </div>
    </div>
  );
}