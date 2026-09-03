import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from '../Dashboard';
import * as api from '../../services/api';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../services/api');

let container = null;
let root = null;

beforeEach(() => {
  jest.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  api.fetchTicketSummary.mockResolvedValue({
    open_count: 5,
    pending_count: 3,
    resolved_today: 7,
    critical_count: 2,
    closed_count: 12
  });

  api.fetchTicketsWithParams.mockResolvedValue({
    tickets: [
      {
        ticket_id: 101,
        subject: 'Email sync failure in Outlook',
        issue_type: 'Software',
        priority: 'High',
        status: 'Open',
        created_at: new Date().toISOString()
      },
      {
        ticket_id: 102,
        subject: 'Laptop battery replacement',
        issue_type: 'Hardware',
        priority: 'Low',
        status: 'Resolved',
        created_at: new Date().toISOString()
      }
    ],
    total: 2
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  container = null;
  root = null;
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('Dashboard Page - Dev QA Tests', () => {
  test('renders Dashboard for Client role with appropriate welcome message and action cards', async () => {
    const clientUser = { user_id: 'c-1', username: 'Alice Smith', role: 'Client' };
    const mockFilter = jest.fn();

    await act(async () => {
      root.render(<Dashboard user={clientUser} onFilter={mockFilter} recentTickets={[]} />);
    });

    expect(container.textContent).toContain('Alice Smith');
    expect(container.textContent).toContain('Create Ticket');
    expect(container.textContent).toContain('My Tickets');
    expect(container.textContent).toContain('View Assets');
  });

  test('renders Dashboard for Support Engineer with triage queues and metric counters', async () => {
    const techUser = { user_id: 't-1', username: 'Bob Tech', role: 'Support Engineer' };
    const mockFilter = jest.fn();

    await act(async () => {
      root.render(<Dashboard user={techUser} onFilter={mockFilter} recentTickets={[]} />);
    });

    expect(container.textContent).toContain('Bob Tech');
    expect(container.textContent).toContain('Assigned Queue');
    expect(container.textContent).toContain('Open Queue');
    expect(container.textContent).toContain('SLA Escalate Alerts');
  });

  test('clicking action cards triggers onFilter with appropriate destination for Admin', async () => {
    const adminUser = { user_id: 'a-1', username: 'Super Admin', role: 'Admin' };
    const mockFilter = jest.fn();

    await act(async () => {
      root.render(<Dashboard user={adminUser} onFilter={mockFilter} recentTickets={[]} />);
    });

    const userMgmtBtn = Array.from(container.querySelectorAll('.action-card')).find(el =>
      el.textContent.includes('User Management')
    );
    expect(userMgmtBtn).toBeTruthy();

    await act(async () => {
      userMgmtBtn.click();
    });

    expect(mockFilter).toHaveBeenCalledWith({ view: 'users' });
  });

  test('clicking KPI card filters tickets by status', async () => {
    const adminUser = { user_id: 'a-1', username: 'Super Admin', role: 'Admin' };
    const mockFilter = jest.fn();

    await act(async () => {
      root.render(<Dashboard user={adminUser} onFilter={mockFilter} recentTickets={[]} />);
    });

    const openKpiBtn = Array.from(container.querySelectorAll('.dashboard-kpi-card')).find(el =>
      el.textContent.includes('Open Tickets')
    );
    expect(openKpiBtn).toBeTruthy();

    await act(async () => {
      openKpiBtn.click();
    });

    expect(mockFilter).toHaveBeenCalledWith({ status: 'Open', view: 'open_queue' });
  });

  test('renders recent tickets list loaded from API', async () => {
    const adminUser = { user_id: 'a-1', username: 'Admin', role: 'Admin' };

    await act(async () => {
      root.render(<Dashboard user={adminUser} onFilter={jest.fn()} recentTickets={[]} />);
    });

    expect(container.textContent).toContain('Email sync failure in Outlook');
    expect(container.textContent).toContain('Laptop battery replacement');
  });
});
