import React from 'react';
import { Database } from 'lucide-react';

export default function EmptyState({ 
  title = 'No results found', 
  message = 'Try modifying your search queries or filter categories.' 
}) {
  return (
    <div className="empty-container">
      <Database size={40} />
      <h3 style={{ margin: '12px 0 6px 0', fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '300px' }}>{message}</p>
    </div>
  );
}
