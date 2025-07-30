import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './InstructionsEditor.css';

export default function InstructionsEditor({ instructions, onChange, placeholder }) {
  // Parse instructions into steps
  const [steps, setSteps] = useState([]);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textValue, setTextValue] = useState('');
  
  useEffect(() => {
    // Handle both string and array instructions
    if (Array.isArray(instructions)) {
      console.log('InstructionsEditor received array:', instructions);
      // If instructions is already an array, use it directly
      setSteps(instructions.filter(step => step && step.trim()));
      // Convert to text for text mode
      const formatted = instructions
        .map((step, index) => `${index + 1}. ${step}`)
        .join('\n');
      setTextValue(formatted);
    } else if (instructions && typeof instructions === 'string' && instructions.trim()) {
      console.log('InstructionsEditor parsing string:', instructions);
      
      // Store the raw text for text mode
      setTextValue(instructions);
      
      // First try to match numbered steps in the format "1. Step text"
      // This handles both newline-separated and continuous text
      const numberedPattern = /(\d+)\.\s*([^]+?)(?=\d+\.\s*|$)/g;
      const numberedMatches = [...instructions.matchAll(numberedPattern)];
      
      console.log('Numbered matches found:', numberedMatches.length);
      
      if (numberedMatches && numberedMatches.length > 0) {
        // Extract just the step text (without the number)
        const parsedSteps = numberedMatches.map(match => match[2].trim());
        console.log('Parsed steps:', parsedSteps);
        setSteps(parsedSteps);
      } else {
        // Try to split by newlines
        const lines = instructions.split(/\n+/).filter(s => s.trim());
        
        if (lines.length > 1) {
          // Multiple lines, use them as steps
          setSteps(lines.map(line => line.replace(/^\d+\.\s*/, '').trim()));
        } else {
          // Single line or no good splits, try sentence splitting
          const sentences = instructions
            .split(/(?<=[.!?])\s+(?=[A-Z])/)
            .map(s => s.trim())
            .filter(s => s.length > 5);
          
          if (sentences.length > 1) {
            setSteps(sentences);
          } else {
            // Last resort: use the whole text as one step
            setSteps([instructions.trim()]);
          }
        }
      }
    } else if (!instructions || instructions === '') {
      setSteps(['']);
      setTextValue('');
    }
  }, [instructions]);
  
  // Update parent when steps change - debounced to prevent flashing
  useEffect(() => {
    if (!onChange || typeof onChange !== 'function') return;
    if (isTextMode) return; // Don't update in text mode
    
    const timer = setTimeout(() => {
      const formatted = steps
        .filter(step => step && step.trim())
        .map((step, index) => {
          // Ensure proper sentence ending
          const trimmedStep = step.trim();
          const properStep = trimmedStep.match(/[.!?]$/) ? trimmedStep : trimmedStep + '.';
          return `${index + 1}. ${properStep}`;
        })
        .join('\n');
      
      // Only update if different to avoid infinite loop
      if (formatted !== instructions) {
        onChange(formatted);
      }
    }, 500); // Debounce for 500ms
    
    return () => clearTimeout(timer);
  }, [steps, isTextMode]); // Don't include onChange or instructions to avoid infinite loops
  
  const handleStepChange = (index, value) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };
  
  const addStep = () => {
    setSteps([...steps, '']);
  };
  
  const removeStep = (index) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index);
      setSteps(newSteps);
    }
  };
  
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSteps(items);
  };
  
  // Toggle between modes
  const handleToggleMode = () => {
    if (!isTextMode) {
      // Switching TO text mode
      const formatted = steps
        .filter(step => step.trim())
        .map((step, index) => `${index + 1}. ${step.trim()}`)
        .join('\n');
      setTextValue(formatted);
      setIsTextMode(true);
    } else {
      // Switching FROM text mode
      const lines = textValue.split('\n').filter(line => line.trim());
      const newSteps = lines.map(line => {
        // Remove numbering if present
        return line.replace(/^\d+\.\s*/, '').trim();
      });
      setSteps(newSteps.length > 0 ? newSteps : ['']);
      setIsTextMode(false);
      // Update parent with the text value
      onChange(textValue);
    }
  };
  
  const handleTextChange = (value) => {
    setTextValue(value);
    onChange(value);
  };
  
  return (
    <div className="instructions-editor">
      <div className="instructions-header">
        <h3>Instructions</h3>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={handleToggleMode}
          title={isTextMode ? "Switch to step mode" : "Switch to text mode"}
        >
          {isTextMode ? 'Switch to Step Mode' : 'Switch to Text Mode'}
        </button>
      </div>
      
      {isTextMode ? (
        <textarea
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholder || "Enter instructions..."}
          className="instructions-textarea"
          rows={10}
        />
      ) : (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="instructions-steps">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="steps-list"
            >
              {steps.map((step, index) => (
                <Draggable
                  key={`step-${index}`}
                  draggableId={`step-${index}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`step-row ${snapshot.isDragging ? 'dragging' : ''}`}
                    >
                      <span
                        {...provided.dragHandleProps}
                        className="drag-handle"
                      >
                        ⋮⋮
                      </span>
                      <div className="step-number">{index + 1}.</div>
                      <textarea
                        value={step}
                        onChange={(e) => handleStepChange(index, e.target.value)}
                        placeholder={`Step ${index + 1}...`}
                        className="step-input"
                        rows={2}
                      />
                      <button
                        type="button"
                        className="remove-step-btn"
                        onClick={() => removeStep(index)}
                        disabled={steps.length === 1}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      )}
      
      {!isTextMode && (
        <button
          type="button"
          className="btn btn-secondary add-step-btn"
          onClick={addStep}
        >
          + Add Step
        </button>
      )}
    </div>
  );
}