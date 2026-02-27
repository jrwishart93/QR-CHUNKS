import { ReactNode } from 'react';

interface GlassCardProps {
  children?: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = '' }: GlassCardProps) {
  return <div className={`glass rounded-3xl p-4 sm:p-6 transition duration-300 hover:-translate-y-0.5 ${className}`}>{children}</div>;
}
