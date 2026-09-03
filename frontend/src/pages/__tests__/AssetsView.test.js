import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AssetsView from '../AssetsView';
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

const SAMPLE_ASSETS = [
  {
    asset_id: 1,
    name: 'Dell XPS 15 Developer Edition',
    client_id: 'u-1',
    status: 'Active',
    deployment_date: '2025-01-10',
    last_maintenance_date: '2026-06-01',
    client: { username: 'alice', email: 'alice@example.com' }
  },
  {
    asset_id: 2,
    name: 'Cisco Catalyst 9200 Switch',
    client_id: null,
    status: 'In Repair',
    deployment_date: '2024-03-15',
    last_maintenance_date: '2026-08-10',
    client: null
  }
];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  api.fetchAssets.mockResolvedValue(SAMPLE_ASSETS);
  api.adminFetchUsers.mockResolvedValue([
    { user_id: 'u-1', username: 'alice', email: 'alice@example.com', role: 'Client' }
  ]);
  api.createAsset.mockResolvedValue({
    asset_id: 3,
    name: 'MacBook Air M2',
    client_id: 'u-1',
    status: 'Active'
  });
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

describe('AssetsView Page - Dev QA Tests', () => {
  test('renders asset inventory list with status badges and metrics', async () => {
    const user = { user_id: 'a-1', username: 'Admin', role: 'Admin' };

    await act(async () => {
      root.render(<AssetsView currentUser={user} />);
    });

    expect(api.fetchAssets).toHaveBeenCalled();
    expect(container.textContent).toContain('Dell XPS 15 Developer Edition');
    expect(container.textContent).toContain('Cisco Catalyst 9200 Switch');
    expect(container.textContent).toContain('Active');
    expect(container.textContent).toContain('In Repair');
  });

  test('filters assets by search query', async () => {
    const user = { user_id: 'a-1', username: 'Admin', role: 'Admin' };

    await act(async () => {
      root.render(<AssetsView currentUser={user} />);
    });

    const searchInput = container.querySelector('input[type="search"]') || container.querySelector('input.control');
    expect(searchInput).toBeTruthy();

    await act(async () => {
      changeInput(searchInput, 'Cisco');
    });

    expect(container.textContent).toContain('Cisco Catalyst 9200 Switch');
  });

  test('opens Add Asset modal for Admin users', async () => {
    const adminUser = { user_id: 'a-1', username: 'Admin', role: 'Admin' };

    await act(async () => {
      root.render(<AssetsView currentUser={adminUser} />);
    });

    const addBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Add Asset') || b.textContent.includes('Register Asset') || b.textContent.includes('+')
    );
    expect(addBtn).toBeTruthy();

    await act(async () => {
      addBtn.click();
    });

    // Check modal opens
    expect(container.textContent).toContain('Asset Name');
  });
});
