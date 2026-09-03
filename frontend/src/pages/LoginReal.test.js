import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import LoginReal from './LoginReal';
import ResetPassword from './ResetPassword';

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

describe('LoginReal - Forgot Password Flow', () => {
  test('renders Forgot password button and toggles to Reset Password form', async () => {
    await act(async () => {
      root.render(<LoginReal onLogin={jest.fn()} onRequestPasswordReset={jest.fn()} />);
    });

    const buttons = container.querySelectorAll('button');
    const forgotBtn = Array.from(buttons).find(b => b.textContent.includes('Forgot password?'));
    expect(forgotBtn).toBeTruthy();

    await act(async () => {
      forgotBtn.click();
    });

    const heading = container.querySelector('h2');
    expect(heading.textContent).toBe('Reset Password');
    
    const sendBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Send Reset Link'));
    expect(sendBtn).toBeTruthy();
  });

  test('validates empty input on Forgot Password submit', async () => {
    const mockReset = jest.fn();
    await act(async () => {
      root.render(<LoginReal onLogin={jest.fn()} onRequestPasswordReset={mockReset} />);
    });

    const forgotBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Forgot password?'));
    await act(async () => {
      forgotBtn.click();
    });

    const form = container.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Please enter your email or username.');
    expect(mockReset).not.toHaveBeenCalled();
  });

  test('calls onRequestPasswordReset and displays success state', async () => {
    const mockReset = jest.fn().mockResolvedValue({ success: true, email: 'alice@example.com' });
    await act(async () => {
      root.render(<LoginReal onLogin={jest.fn()} onRequestPasswordReset={mockReset} />);
    });

    const forgotBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Forgot password?'));
    await act(async () => {
      forgotBtn.click();
    });

    const input = container.querySelector('input.control');
    await act(async () => {
      changeInput(input, 'alice');
    });

    const form = container.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockReset).toHaveBeenCalledWith('alice');
    expect(container.textContent).toContain('Reset Link Sent');
    expect(container.textContent).toContain('alice@example.com');
  });

  test('can navigate back to sign in from forgot password view', async () => {
    await act(async () => {
      root.render(<LoginReal onLogin={jest.fn()} onRequestPasswordReset={jest.fn()} />);
    });

    const forgotBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Forgot password?'));
    await act(async () => {
      forgotBtn.click();
    });

    expect(container.querySelector('h2').textContent).toBe('Reset Password');

    const backBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Back to Sign In'));
    await act(async () => {
      backBtn.click();
    });

    expect(container.querySelector('h2').textContent).toBe('Skone IT Support');
    expect(container.querySelector('button[type="submit"]').textContent).toContain('Sign In');
  });
});

describe('ResetPassword Component', () => {
  test('validates minimum length and password matching', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ success: true });
    await act(async () => {
      root.render(<ResetPassword onUpdatePassword={mockUpdate} onCancel={jest.fn()} />);
    });

    const inputs = container.querySelectorAll('input.control');
    const newPassInput = inputs[0];
    const confirmPassInput = inputs[1];
    const saveBtn = container.querySelector('button[type="submit"]');

    expect(saveBtn.disabled).toBe(true);

    // Mismatched
    await act(async () => {
      changeInput(newPassInput, 'password123');
      changeInput(confirmPassInput, 'different123');
    });
    expect(saveBtn.disabled).toBe(true);

    // Matching
    await act(async () => {
      changeInput(confirmPassInput, 'password123');
    });
    expect(saveBtn.disabled).toBe(false);

    const form = container.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockUpdate).toHaveBeenCalledWith('password123');
    expect(container.textContent).toContain('Password Updated!');
  });
});
