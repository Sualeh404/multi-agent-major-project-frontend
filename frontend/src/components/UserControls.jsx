import { useState } from 'react';

interface UserControlsProps {
  depth: 'rapid' | 'comprehensive';
  maxPapers: number;
  revisionLimit: number;
  onDepthChange: (depth: 'rapid' | 'comprehensive') => void;
  onMaxPapersChange: (value: number) => void;
  onRevisionLimitChange: (value: number) => void;
  disabled?: boolean;
}

export default function UserControls({
  depth,
  maxPapers,
  revisionLimit,
  onDepthChange,
  onMaxPapersChange,
  onRevisionLimitChange,
  disabled = false
}: UserControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-white p-4 rounded-lg shadow" role="region" aria-label="Search Controls">
      <h3 className="text-lg font-semibold mb-4">Search Settings</h3>
      
      {/* Cognitive Depth Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2" id="depth-label">Cognitive Depth</label>
        <div className="flex space-x-2" role="radiogroup" aria-labelledby="depth-label">
          <button
            className={`px-4 py-2 rounded ${
              depth === 'rapid' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => onDepthChange('rapid')}
            disabled={disabled}
            role="radio"
            aria-checked={depth === 'rapid'}
          >
            Rapid (2 papers, 1 revision)
          </button>
          <button
            className={`px-4 py-2 rounded ${
              depth === 'comprehensive' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => onDepthChange('comprehensive')}
            disabled={disabled}
            role="radio"
            aria-checked={depth === 'comprehensive'}
          >
            Comprehensive (5 papers, 2 revisions)
          </button>
        </div>
      </div>

      {/* Max Papers Slider */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Max Papers: <span className="font-bold">{maxPapers}</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={maxPapers}
          onChange={(e) => onMaxPapersChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full"
          aria-label="Maximum number of papers"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      {/* Revision Limit Slider */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Revision Limit: <span className="font-bold">{revisionLimit}</span>
        </label>
        <input
          type="range"
          min={1}
          max={3}
          value={revisionLimit}
          onChange={(e) => onRevisionLimitChange(Number(e.target.value))}
          disabled={disabled}
          className="w-full"
          aria-label="Maximum revision attempts"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1</span>
          <span>3</span>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-blue-600 hover:text-blue-800 text-sm underline"
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </button>

      {showAdvanced && (
        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600">
          <p>Advanced settings locked during active synthesis.</p>
          <p className="mt-1">Circuit breaker and low confidence flags cannot be overridden for safety.</p>
        </div>
      )}
    </div>
  );
}
