import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '✨',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: 'rgba(30, 41, 59, 0.4)',
        borderRadius: '1.25rem',
        border: '1px dashed rgba(148, 163, 184, 0.25)',
        margin: '1.5rem 0',
      }}
    >
      <div
        style={{
          fontSize: '3rem',
          marginBottom: '1rem',
          background: 'rgba(56, 189, 248, 0.1)',
          width: '5rem',
          height: '5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
        }}
      >
        {icon}
      </div>
      <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.2rem', fontWeight: 600 }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 1.5rem', color: '#94a3b8', fontSize: '0.95rem', maxWidth: '420px', lineHeight: 1.6 }}>
        {description}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.4rem',
              borderRadius: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.39)',
              transition: 'all 0.2s ease',
            }}
          >
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            style={{
              background: 'rgba(51, 65, 85, 0.5)',
              color: '#cbd5e1',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
