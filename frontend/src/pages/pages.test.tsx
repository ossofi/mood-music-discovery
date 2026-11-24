import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { useAuthStore } from '@/stores/authStore';

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  email = 'alice@example.com',
  password = 'correct-horse-battery',
) {
  await user.type(await screen.findByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('authentication', () => {
  it('redirects a visitor from a protected page to the login form', async () => {
    renderApp('/playlists');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows validation messages before calling the API', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your e-mail.')).toBeInTheDocument();
  });

  it('shows an error for a wrong password and keeps the user signed out', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await signIn(user, 'alice@example.com', 'wrong-password');
    expect(await screen.findByText('E-mail or password is incorrect.')).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('signs in with the demo account and opens the quiz', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await signIn(user);
    expect(
      await screen.findByRole('heading', { name: 'How are you feeling?' }),
    ).toBeInTheDocument();
  });

  it('reports an already registered e-mail on the field', async () => {
    const user = userEvent.setup();
    renderApp('/register');
    await user.type(await screen.findByLabelText('E-mail'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-enough-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('This e-mail is already registered.')).toBeInTheDocument();
  });
});

describe('quiz to playlist', () => {
  it('walks through the quiz and shows a ranked playlist', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await signIn(user);
    for (let i = 0; i < 4; i++) {
      const options = await screen.findAllByRole('radio');
      await user.click(options[0]!);
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    await user.click(await screen.findByRole('button', { name: 'Get my playlist' }));
    expect(await screen.findByRole('heading', { name: 'Your playlist' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: '4 out of 5' }));
    expect(await screen.findByText(/You rated this playlist 4\/5/)).toBeInTheDocument();
  });
});

describe('not found', () => {
  it('shows a friendly 404 page', async () => {
    renderApp('/nope');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
