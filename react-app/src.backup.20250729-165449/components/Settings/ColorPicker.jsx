import React, { useState, useEffect } from 'react';
import './ColorPicker.css';

export default function ColorPicker({ color = '#FFFFFF', opacity = 1, onChange, disabled = false }) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(100);
  const [currentOpacity, setCurrentOpacity] = useState(opacity);
  const [hexInput, setHexInput] = useState(color);
  
  useEffect(() => {
    // Convert hex to HSL when color prop changes
    const { h, s, l } = hexToHsl(color);
    setHue(h);
    setSaturation(s);
    setLightness(l);
    setHexInput(color);
  }, [color]);

  useEffect(() => {
    setCurrentOpacity(opacity);
  }, [opacity]);

  // Convert HSL to Hex
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  };

  // Convert Hex to HSL
  const hexToHsl = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 100 };

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
        default: break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const updateColor = (h = hue, s = saturation, l = lightness) => {
    const newHex = hslToHex(h, s, l);
    setHexInput(newHex);
    onChange(newHex, currentOpacity);
  };

  const handleHueChange = (e) => {
    const newHue = parseInt(e.target.value);
    setHue(newHue);
    updateColor(newHue, saturation, lightness);
  };

  const handleSaturationChange = (e) => {
    const newSaturation = parseInt(e.target.value);
    setSaturation(newSaturation);
    updateColor(hue, newSaturation, lightness);
  };

  const handleLightnessChange = (e) => {
    const newLightness = parseInt(e.target.value);
    setLightness(newLightness);
    updateColor(hue, saturation, newLightness);
  };

  const handleOpacityChange = (e) => {
    const newOpacity = parseFloat(e.target.value);
    setCurrentOpacity(newOpacity);
    onChange(hexInput, newOpacity);
  };

  const handleHexInput = (e) => {
    const value = e.target.value;
    setHexInput(value);
    
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      const { h, s, l } = hexToHsl(value);
      setHue(h);
      setSaturation(s);
      setLightness(l);
      onChange(value, currentOpacity);
    }
  };

  // Generate color preview style
  const previewStyle = {
    backgroundColor: hslToHex(hue, saturation, lightness),
    opacity: currentOpacity
  };

  // Generate gradient backgrounds for sliders
  const hueGradient = `linear-gradient(to right, 
    hsl(0, 100%, 50%), 
    hsl(60, 100%, 50%), 
    hsl(120, 100%, 50%), 
    hsl(180, 100%, 50%), 
    hsl(240, 100%, 50%), 
    hsl(300, 100%, 50%), 
    hsl(360, 100%, 50%))`;

  const saturationGradient = `linear-gradient(to right, 
    hsl(${hue}, 0%, ${lightness}%), 
    hsl(${hue}, 100%, ${lightness}%))`;

  const lightnessGradient = `linear-gradient(to right, 
    hsl(${hue}, ${saturation}%, 0%), 
    hsl(${hue}, ${saturation}%, 50%), 
    hsl(${hue}, ${saturation}%, 100%))`;

  return (
    <div className={`color-picker ${disabled ? 'disabled' : ''}`}>
      {/* Color Preview */}
      <div className="color-preview-section">
        <div className="color-preview-container">
          <div className="color-preview" style={previewStyle}></div>
          <div className="color-preview-bg"></div>
        </div>
      </div>

      {/* Sliders */}
      <div className="color-sliders">
        <div className="slider-group" data-slider="hue">
          <label>
            <span>Hue</span>
            <span className="slider-value">{hue}°</span>
          </label>
          <div 
            className="slider-track" 
            style={{ 
              background: hueGradient
            }}
          >
            <div 
              className="slider-thumb"
              style={{
                left: `calc(${(hue / 360) * 100}% - 10px)`
              }}
            />
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={handleHueChange}
              disabled={disabled}
              className="color-slider"
            />
          </div>
        </div>

        <div className="slider-group" data-slider="saturation">
          <label>
            <span>Saturation</span>
            <span className="slider-value">{saturation}%</span>
          </label>
          <div 
            className="slider-track" 
            style={{ 
              background: saturationGradient
            }}
          >
            <div 
              className="slider-thumb"
              style={{
                left: `calc(${(saturation / 100) * 100}% - 10px)`
              }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={saturation}
              onChange={handleSaturationChange}
              disabled={disabled}
              className="color-slider"
            />
          </div>
        </div>

        <div className="slider-group" data-slider="lightness">
          <label>
            <span>Lightness</span>
            <span className="slider-value">{lightness}%</span>
          </label>
          <div 
            className="slider-track" 
            style={{ 
              background: lightnessGradient
            }}
          >
            <div 
              className="slider-thumb"
              style={{
                left: `calc(${(lightness / 100) * 100}% - 10px)`
              }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={lightness}
              onChange={handleLightnessChange}
              disabled={disabled}
              className="color-slider"
            />
          </div>
        </div>

        <div className="slider-group" data-slider="opacity">
          <label>
            <span>Opacity</span>
            <span className="slider-value">{Math.round(currentOpacity * 100)}%</span>
          </label>
          <div 
            className="slider-track opacity-track"
          >
            <div 
              className="slider-thumb"
              style={{
                left: `calc(${currentOpacity * 100}% - 10px)`
              }}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentOpacity}
              onChange={handleOpacityChange}
              disabled={disabled}
              className="color-slider"
            />
          </div>
        </div>
      </div>

      {/* Color Info */}
      <div className="color-info">
        <div className="hex-input-group">
          <label>Hex Color</label>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInput}
            placeholder="#FFFFFF"
            maxLength="7"
            disabled={disabled}
            className="hex-input"
          />
        </div>

        <div className="color-values">
          <div className="color-value">
            <span className="value-label">H:</span>
            <span className="value">{hue}°</span>
          </div>
          <div className="color-value">
            <span className="value-label">S:</span>
            <span className="value">{saturation}%</span>
          </div>
          <div className="color-value">
            <span className="value-label">L:</span>
            <span className="value">{lightness}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}