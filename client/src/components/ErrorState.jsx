import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({ 
  error, 
  onRetry 
}) {
  const isDbConfigError = error?.message?.includes('COGNODB') || 
                           error?.message?.includes('credential') ||
                           error?.message?.includes('unreachable') ||
                           error?.message?.includes('connection') ||
                           error?.message?.includes('503');

  return (
    <div className="error-container">
      <AlertCircle size={48} />
      <h2 className="error-title">Database Connection Problem</h2>
      
      <p className="error-message">
        {error?.message || 'We encountered an error connecting to the graph database.'}
      </p>

      {isDbConfigError && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          padding: '16px',
          margin: '0 auto 24px auto',
          maxWidth: '500px',
          textAlign: 'left',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: '#ffffff', display: 'block', marginBottom: '8px' }}>Troubleshooting Steps:</strong>
          <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Verify you have created a <code>server/.env</code> file with valid CognoDB Cloud connection details.</li>
            <li>Ensure the format of <code>COGNODB_URI</code> is <code>bolt+s://&lt;instance-id&gt;.databases.cognodb.cloud</code>.</li>
            <li>Ensure the <code>COGNODB_PASSWORD</code> has no trailing spaces.</li>
            <li>Make sure you ran the seed script: <code>npm run seed</code> or <code>node database/seed/seed.js</code> to initialize the schema structure.</li>
          </ul>
        </div>
      )}

      {onRetry && (
        <button className="btn-primary" onClick={onRetry} style={{ display: 'inline-flex', margin: '0 auto' }}>
          <RefreshCw size={16} />
          <span>Try Connecting Again</span>
        </button>
      )}
    </div>
  );
}
