import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLogout } from '@/api/queries';
import { useAuthStore } from '@/stores/authStore';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ToastHost } from './ToastHost';

const NAV = [
  { to: '/quiz', label: 'Quiz' },
  { to: '/playlists', label: 'Playlists' },
  { to: '/feed', label: 'Feed' },
  { to: '/profile', label: 'Profile' },
];

/** Responsive shell: bottom tab bar (phone), top navigation (tablet), sidebar (desktop). */
export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const logout = useLogout();
  const links = NAV.map((n) => (
    <NavLink key={n.to} to={n.to}>
      {n.label}
    </NavLink>
  ));
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand">
          Mood·Swing
        </NavLink>
        {user && (
          <nav className="nav" aria-label="Main">
            {links}
          </nav>
        )}
        <div className="spacer" />
        <div className="actions">
          <ThemeSwitcher />
          {user ? (
            <button
              type="button"
              className="btn secondary small"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
            >
              Sign out
            </button>
          ) : (
            <NavLink className="btn small" to="/login">
              Sign in
            </NavLink>
          )}
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      {user && (
        <nav className="tabbar" aria-label="Main">
          {links}
        </nav>
      )}
      <ToastHost />
    </div>
  );
}
