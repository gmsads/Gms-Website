import React from 'react';

const EXTRACTION_STYLES = {
  PENDING: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Pending OCR' },
  PROCESSING: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd', label: 'Processing OCR...' },
  COMPLETED: { bg: '#ecfdf5', text: '#047857', border: '#6ee7b7', label: 'Extracted' },
  FAILED: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', label: 'OCR Failed' },
};

const REVIEW_STYLES = {
  PENDING_REVIEW: { bg: '#fffbeb', text: '#b45309', border: '#fcd34d', label: 'Awaiting Review' },
  APPROVED: { bg: '#ecfdf5', text: '#047857', border: '#6ee7b7', label: 'Approved' },
  REJECTED: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', label: 'Rejected' },
};

const VERIFICATION_STYLES = {
  UNVERIFIED: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', label: 'Unverified (Bank)' },
  VERIFIED: { bg: '#eef2ff', text: '#3730a3', border: '#a5b4fc', label: 'Bank Verified' },
  DISPUTED: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', label: 'Disputed' },
};

const SYNC_STYLES = {
  NOT_SYNCED: { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1', label: 'Not Synced' },
  SYNC_PENDING: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', label: 'Syncing...' },
  SYNCED: { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7', label: 'Synced to Sheet' },
  SYNC_FAILED: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', label: 'Sync Failed' },
};

function Badge({ styleMap, status }) {
  const cfg = styleMap[status] || {
    bg: '#f1f5f9',
    text: '#334155',
    border: '#cbd5e1',
    label: status || 'Unknown',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

export function ExtractionStatusBadge({ status }) {
  return <Badge styleMap={EXTRACTION_STYLES} status={status} />;
}

export function ReviewStatusBadge({ status }) {
  return <Badge styleMap={REVIEW_STYLES} status={status} />;
}

export function VerificationStatusBadge({ status }) {
  return <Badge styleMap={VERIFICATION_STYLES} status={status} />;
}

export function SyncStatusBadge({ status }) {
  return <Badge styleMap={SYNC_STYLES} status={status} />;
}
