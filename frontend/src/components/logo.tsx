
import React from 'react';
import { Headphones } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  const iconSizes = {
    sm: 12,
    md: 20,
    lg: 28
  };

  return (
    <div className="flex items-center gap-2">
      <div className="bg-gradient-to-r from-pod-gradient-start to-pod-gradient-end text-white p-2 rounded-lg logo-glow">
        <Headphones size={iconSizes[size]} className="animate-float" />
      </div>
      <h1 className={`font-display font-semibold ${sizeClasses[size]}`}>
        <span className="text-white">Pod</span>
        <span className="text-gradient">Notes</span>
      </h1>
    </div>
  );
};

export default Logo;
