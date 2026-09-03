import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import TicketQueueWorkspace from '../TicketQueueWorkspace';
import TicketList from '../../components/TicketList';
import TicketForm from '../../components/TicketForm';
import * as api from '../../services/api';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../services/api');

let container = null;
let root = null;

function changeInput(element, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  nativeInputValueSetter.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function changeTextarea(element, value) {
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  ).set;
  nativeTextareaValueSetter.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

const SAMPLE_TICKETS = [
  {
    ticket_id: 101,
    subject: 'VPN Tunnel disconnected repeatedly',
    issue_type: 'Network',
    priority: 'Critical',
    status: 'Open',
    assigned_tech: null,
    client: { username: 'alice', email: 'alice@example.com' },
    created_at: new Date().toISOString()
  },
  {
    ticket_id: 102,
    subject: 'Request for secondary monitor',
    issue_type: 'Hardware',
    priority: 'Low',
    status: 'Assigned',
    assigned_tech: 'Bob Tech',
    client: { username: 'charlie', email: 'charlie@example.com' },
    created_at: new Date().toISOString()
  }
];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  api.adminFetchUsers.mockResolvedValue([
    { user_id: 'u-1', username: 'Bob Tech', role: 'Support Engineer' }
  ]);
  api.fetchComments.mockResolvedValue([
    { id: 1, message: 'We are investigating this issue.', user: { username: 'Bob Tech', role: 'Support Engineer' }, created_at: new Date().toISOString() }
  ]);
  api.fetchTicketHistory.mockResolvedValue([
    { id: 1, action: 'status_change', old_value: 'Open', new_value: 'Assigned', changed_by_user: { username: 'Admin', role: 'Admin' }, created_at: new Date().toISOString() }
  ]);
  api.fetchAssets.mockResolvedValue([
    { asset_id: 5, name: 'MacBook Pro 16"', client_id: 'u-1', status: 'Active' }
  ]);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  container = null;
  root = null;
  jest.clearAllMocks();
});

describe('Ticket Management Views - Dev QA Tests', () => {
  test('TicketQueueWorkspace filters by viewType and selects ticket for detailed inspection', async () => {
    const user = { user_id: 'u-1', username: 'Bob Tech', role: 'Support Engineer' };

    // Test open_queue viewType
    await act(async () => {
      root.render(
        <TicketQueueWorkspace
          tickets={SAMPLE_TICKETS}
          loading={false}
          isSupport={true}
          onUpdateTicket={jest.fn()}
          page={1}
          page_size={20}
          total={2}
          onPageChange={jest.fn()}
          onRefresh={jest.fn()}
          currentUser={user}
          viewType="open_queue"
        />
      );
    });

    expect(container.textContent).toContain('VPN Tunnel disconnected repeatedly');

    // Click ticket card to open workspace details
    const ticketCard = container.querySelector('.triage-card');
    expect(ticketCard).toBeTruthy();

    await act(async () => {
      ticketCard.click();
    });

    // Check comments load for selected ticket
    expect(api.fetchComments).toHaveBeenCalledWith(101);
  });

  test('TicketList renders table layout with status badges and pagination controls', async () => {
    const user = { user_id: 'c-1', username: 'alice', role: 'Client' };

    await act(async () => {
      root.render(
        <TicketList
          tickets={SAMPLE_TICKETS}
          loading={false}
          isSupport={false}
          showTable={true}
          onUpdateTicket={jest.fn()}
          page={1}
          page_size={20}
          total={2}
          onPageChange={jest.fn()}
          currentUser={user}
        />
      );
    });

    expect(container.textContent).toContain('TK-101');
    expect(container.textContent).toContain('VPN Tunnel disconnected repeatedly');
    expect(container.textContent).toContain('Open');
    expect(container.textContent).toContain('Critical');
  });

  test('TicketForm validates required fields and submits ticket successfully', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ ticket_id: 103 });
    const mockNavigate = jest.fn();
    const user = { user_id: 'c-1', username: 'alice', role: 'Client' };

    await act(async () => {
      root.render(
        <TicketForm
          onSubmit={mockSubmit}
          defaultClientId="c-1"
          onNavigate={mockNavigate}
          user={user}
        />
      );
    });

    // Attempt submitting without fields
    const form = container.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Category is required.');
    expect(container.textContent).toContain('Description is required.');
    expect(mockSubmit).not.toHaveBeenCalled();

    // Select category (Software)
    const categoryBtns = container.querySelectorAll('.category-card, button');
    const softwareBtn = Array.from(categoryBtns).find(b => b.textContent.includes('Software'));
    expect(softwareBtn).toBeTruthy();

    await act(async () => {
      softwareBtn.click();
    });

    // Fill Subject and Description
    const subjectInput = container.querySelector('input[name="subject"]');
    const descTextarea = container.querySelector('textarea[name="description"]');

    expect(subjectInput).toBeTruthy();
    expect(descTextarea).toBeTruthy();

    await act(async () => {
      changeInput(subjectInput, 'Slack crashes on launch');
      changeTextarea(descTextarea, 'Whenever I launch Slack, the window closes immediately with code 139.');
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockSubmit).toHaveBeenCalled();
  });
});
