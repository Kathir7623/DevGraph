import React from 'react';

export default function LoadingState({ message = 'Loading network details...' }) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}
