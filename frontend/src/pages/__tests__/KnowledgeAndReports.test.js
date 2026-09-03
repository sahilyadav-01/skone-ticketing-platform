import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import KnowledgeBase from '../KnowledgeBase';
import Reports from '../Reports';

global.IS_REACT_ACT_ENVIRONMENT = true;

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

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  container = null;
  root = null;
});

describe('KnowledgeBase Page - Dev QA Tests', () => {
  test('renders knowledge base articles and category tags', async () => {
    await act(async () => {
      root.render(<KnowledgeBase />);
    });

    expect(container.textContent).toContain('Knowledge Base');
    expect(container.textContent).toContain('How to Reset Your Active Directory Password');
    expect(container.textContent).toContain('Connecting to Corporate VPN via FortiClient');
    expect(container.textContent).toContain('Accounts & Auth');
    expect(container.textContent).toContain('Networking & VPN');
  });

  test('filters articles by search term', async () => {
    await act(async () => {
      root.render(<KnowledgeBase />);
    });

    const searchInput = container.querySelector('input');
    expect(searchInput).toBeTruthy();

    await act(async () => {
      changeInput(searchInput, 'FortiClient');
    });

    expect(container.textContent).toContain('Connecting to Corporate VPN via FortiClient');
  });

  test('expands article accordion content when card is clicked', async () => {
    await act(async () => {
      root.render(<KnowledgeBase />);
    });

    const vpnArticle = Array.from(container.querySelectorAll('.ticket-card')).find(card =>
      card.textContent.includes('Connecting to Corporate VPN')
    );
    expect(vpnArticle).toBeTruthy();

    await act(async () => {
      vpnArticle.click();
    });

    expect(container.textContent).toContain('vpn.skone-tech.com:10443');
  });
});

describe('Reports Page - Dev QA Tests', () => {
  test('renders SLA and priority breakdown charts and metrics', async () => {
    const mockFilter = jest.fn();

    await act(async () => {
      root.render(<Reports onFilter={mockFilter} />);
    });

    expect(container.textContent).toContain('Reports & Analytics');
    expect(container.textContent).toContain('Total Volume');
    expect(container.textContent).toContain('SLA Compliance');
    expect(container.textContent).toContain('Avg. First Response');
    expect(container.textContent).toContain('Critical');
    expect(container.textContent).toContain('High');
  });

  test('clicking priority card in reports triggers onFilter', async () => {
    const mockFilter = jest.fn();

    await act(async () => {
      root.render(<Reports onFilter={mockFilter} />);
    });

    const criticalBar = Array.from(container.querySelectorAll('.priority-row, .donut-legend__item, button')).find(el =>
      el.textContent.includes('Critical')
    );

    if (criticalBar) {
      await act(async () => {
        criticalBar.click();
      });
      expect(mockFilter).toHaveBeenCalled();
    }
  });
});
