import React from 'react';

export default function StatusBadge({ status, type = 'ticket' }) {
  const value = String(status || '').trim();
  const lowerValue = value.toLowerCase();

  let variant = 'neutral';
  
  if (type === 'asset') {
    // Asset statuses: Active, In Repair, Decommissioned, Retire
    if (lowerValue.includes('retire') || lowerValue.includes('decommission')) {
      variant = 'danger';
    } else if (lowerValue.includes('active') || lowerValue.includes('in stock') || lowerValue.includes('available')) {
      variant = 'success';
    } else if (lowerValue.includes('repair')) {
      variant = 'warning';
    }
  } else {
    // Ticket statuses: Open, Assigned, In Progress, Resolved, Closed, Waiting for Vendor
    if (lowerValue.includes('resolved') || lowerValue === 'done') {
      variant = 'success';
    } else if (
      lowerValue.includes('progress') ||
      lowerValue.includes('assign') ||
      lowerValue.includes('vendor') ||
      lowerValue.includes('in')
    ) {
      variant = 'warning';
    } else if (lowerValue.includes('open') || lowerValue === 'todo' || lowerValue.includes('pending')) {
      variant = 'info';
    } else if (lowerValue.includes('closed')) {
      variant = 'neutral';
    }
  }

  return (
    <span className={`status-badge status-${variant}`}>
      {value || 'Unknown'}
    </span>
  );
}
