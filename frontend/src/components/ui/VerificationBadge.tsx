import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import type { VerificationStatus } from '@/lib/mockData';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

const CONFIG: Record<VerificationStatus, { label: string; icon: typeof ShieldCheck; className: string }> = {
  VERIFIED: { label: 'Verified', icon: ShieldCheck, className: 'text-severity-low' },
  WEAK: { label: 'Weak match', icon: ShieldAlert, className: 'text-severity-medium' },
  UNVERIFIED: { label: 'Unverified', icon: ShieldQuestion, className: 'text-severity-high' },
};

// verify.py's deterministic word-overlap check against the sourced facts --
// an independent, explainable signal, not another AI's opinion of itself.
export default function VerificationBadge({ status, size = 'sm' }: VerificationBadgeProps) {
  const { label, icon: Icon, className } = CONFIG[status];
  const textSize = size === 'sm' ? 'text-2xs' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium ${textSize} ${className}`}
      title="Independently checked against the sourced facts (verify.py)"
    >
      <Icon size={size === 'sm' ? 11 : 13} />
      {label}
    </span>
  );
}
