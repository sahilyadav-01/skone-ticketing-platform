import React, { useState, useEffect } from 'react';

export default function SlaTimer({ ticket }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [slaStatus, setSlaStatus] = useState('good'); // 'good', 'warning', 'breached', 'resolved'

  useEffect(() => {
    const calculateTime = () => {
      if (!ticket) return;

      if (ticket.status === 'Closed' || ticket.status === 'Resolved') {
        setTimeLeft('Resolved');
        setSlaStatus('resolved');
        return;
      }

      const priorityHours = {
        'Critical': 2,
        'High': 8,
        'Medium': 24,
        'Low': 72
      }[ticket.priority] || 24;

      const createdTime = new Date(ticket.created_at).getTime();
      const dueTime = createdTime + (priorityHours * 60 * 60 * 1000);
      const now = Date.now();
      const diff = dueTime - now;

      if (diff <= 0) {
        setTimeLeft('SLA Breached');
        setSlaStatus('breached');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      let str = '';
      if (hours > 0) {
        str += `${hours}h `;
      }
      str += `${mins}m left`;
      setTimeLeft(str);

      const totalSlaMs = priorityHours * 60 * 60 * 1000;
      const ratio = diff / totalSlaMs;
      if (ratio < 0.25) {
        setSlaStatus('warning');
      } else {
        setSlaStatus('good');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [ticket]);

  let statusClass = '';
  let statusIcon = '⏱️';
  if (slaStatus === 'good') {
    statusClass = 'sla-good';
  } else if (slaStatus === 'warning') {
    statusClass = 'sla-warning';
    statusIcon = '⚠️';
  } else if (slaStatus === 'breached') {
    statusClass = 'sla-breached';
    statusIcon = '🚨';
  } else if (slaStatus === 'resolved') {
    statusClass = 'sla-resolved';
    statusIcon = '✅';
  }

  const priorityHours = {
    'Critical': 2,
    'High': 8,
    'Medium': 24,
    'Low': 72
  }[ticket?.priority] || 24;
  const dueDateTime = new Date(new Date(ticket?.created_at).getTime() + (priorityHours * 60 * 60 * 1000)).toLocaleString();

  return (
    <span 
      className={`sla-badge ${statusClass}`} 
      title={`SLA target: ${priorityHours}h. Due: ${dueDateTime}`}
    >
      {statusIcon} {timeLeft}
    </span>
  );
}
