import { ReactNode } from 'react';

interface GlassCardProps {
  children?: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = '' }: GlassCardProps) {
  return <div className={`glass rounded-3xl p-5 md:p-6 ${className}`}>{children}</div>;
}
