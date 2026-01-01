
import React from 'react';

const MoroccanPattern: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`absolute inset-0 zellij-pattern opacity-10 pointer-events-none ${className}`} />
);

export default MoroccanPattern;
