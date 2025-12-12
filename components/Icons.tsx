import React from 'react';

export const KhateebIcon = ({ size = 24, strokeWidth = 2, ...props }: React.SVGProps<SVGSVGElement> & { size?: number, strokeWidth?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    stroke="none"
    {...props}
  >
    <path d="M12 2a4 4 0 0 0-4 4c0 .8.2 1.5.6 2.1L4 11v11h16V11l-4.6-2.9c.4-.6.6-1.3.6-2.1a4 4 0 0 0-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-6 9l4-2.5v11H6V13zm12 0v11h-4V10.5l4 2.5z" />
  </svg>
);
