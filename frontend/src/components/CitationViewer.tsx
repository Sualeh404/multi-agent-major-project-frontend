import { useState } from 'react';

interface CitationViewerProps {
  synthesis: string;
  citationMap: Array<{ claim: string; chunkId: string; text: string }>;
}

export default function SplitPaneCitationViewer({ synthesis, citationMap }: CitationViewerProps) {
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);

  const handleCitationClick = (citationId: string) => {
    setSelectedCitation(citationId);
    const element = document.getElementById(`chunk-${citationId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-yellow-200');
      setTimeout(() => element.classList.remove('bg-yellow-200'), 2000);
    }
  };

  // Simple markdown rendering with citation support
  const renderWithCitations = (text: string) => {
    return text.split(/($\d+$)/g).map((part, i) => {
      const match = part.match(/$(\d+)$/);
      if (match) {
        return (
          <button
            key={i}
            onClick={() => handleCitationClick(match[1])}
            className="text-blue-600 hover:text-blue-800 underline font-semibold"
            aria-label={`View citation ${match[1]}`}
          >
            {part}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-screen" role="region" aria-label="Citation Viewer">
      {/* Left Pane: Synthesis */}
      <div className="w-1/2 p-6 overflow-y-auto border-r" aria-label="Synthesis Content">
        <h2 className="text-xl font-bold mb-4">Literature Review</h2>
        <div className="prose max-w-none">
          {renderWithCitations(synthesis)}
        </div>
      </div>

      {/* Right Pane: Source Viewer */}
      <div className="w-1/2 p-6 overflow-y-auto" aria-label="Source Document Viewer">
        <h2 className="text-xl font-bold mb-4">Source Documents</h2>
        <div className="space-y-4">
          {citationMap.map((item, idx) => (
            <div
              id={`chunk-${idx + 1}`}
              key={idx}
              className={`p-4 rounded border transition-colors duration-500 ${
                selectedCitation === String(idx + 1) ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50'
              }`}
            >
              <p className="text-sm text-gray-700">{item.text}</p>
              <p className="text-xs text-gray-500 mt-2">Chunk ID: {item.chunkId}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
