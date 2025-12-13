import { useState, useEffect, useCallback, useMemo } from 'react';
import { URLS } from '../config';

interface ReportModalProps {
  sceneId: string | null;
  onClose: () => void;
}

function syntaxHighlight(json: string): string {
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export function ReportModal({ sceneId, onClose }: ReportModalProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportUrl = useMemo(() => {
    if (!sceneId) return '';
    return URLS.getSceneReport(sceneId);
  }, [sceneId]);

  useEffect(() => {
    if (!sceneId) return;

    async function fetchReport() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(reportUrl);

        if (response.ok) {
          const data = await response.json();
          const formatted = JSON.stringify(data, null, 2);
          setContent(syntaxHighlight(formatted));
        } else if (response.status === 404) {
          setError('No report found for this scene');
        } else {
          setError(`Error loading report: HTTP ${response.status}`);
        }
      } catch (err) {
        setError(`Failed to load report: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [sceneId, reportUrl]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!sceneId) return null;

  return (
    <div className="modal show" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">Report: {sceneId}</div>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-url">
          <a href={reportUrl} target="_blank" rel="noopener noreferrer">
            {reportUrl}
          </a>
        </div>
        <div className="modal-body">
          {isLoading && <div className="loading">Loading report...</div>}
          {error && <div className="error-message">{error}</div>}
          {!isLoading && !error && (
            <div
              className="json-viewer"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
