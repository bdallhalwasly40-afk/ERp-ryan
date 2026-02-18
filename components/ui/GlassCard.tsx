import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`glass-panel rounded-2xl p-6 shadow-xl ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
          {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};