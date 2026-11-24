import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { useLogin, useRegister } from '@/api/queries';
import { Button } from '@/components/ui';
import { TextField } from '@/components/TextField';
import { applyServerErrors } from '@/lib/forms';
import { useAuthStore } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().min(1, 'Enter your e-mail.').email('Enter a valid e-mail address.'),
  password: z.string().min(1, 'Enter your password.'),
});
type LoginForm = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  displayName: z.string().max(50, 'Up to 50 characters.').optional(),
  email: z.string().min(1, 'Enter your e-mail.').email('Enter a valid e-mail address.'),
  password: z.string().min(10, 'At least 10 characters.'),
});
type RegisterForm = z.infer<typeof registerSchema>;

function useAfterAuth() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return from && from !== '/login' ? from : '/quiz';
}

export function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const target = useAfterAuth();
  const login = useLogin();
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const { errors } = form.formState;
  if (token) return <Navigate to={target} replace />;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => navigate(target, { replace: true }),
      onError: (e) => applyServerErrors(e, form.setError),
    }),
  );
  const apiError = login.error instanceof ApiError ? login.error : null;
  return (
    <div className="card stack" style={{ maxWidth: '28rem', margin: '0 auto' }}>
      <h1>Sign in</h1>
      <form className="stack" onSubmit={onSubmit} noValidate>
        {apiError && (apiError.status === 401 || apiError.status === 429) && (
          <p className="alert error" role="alert">
            {apiError.status === 429
              ? 'Too many attempts. Please wait 15 minutes.'
              : 'E-mail or password is incorrect.'}
          </p>
        )}
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
      {import.meta.env.VITE_API_MOCK === 'true' && (
        <p className="hint">Demo account: alice@example.com / correct-horse-battery</p>
      )}
    </div>
  );
}

export function RegisterPage() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const register = useRegister();
  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const { errors } = form.formState;
  if (token) return <Navigate to="/quiz" replace />;

  const onSubmit = form.handleSubmit((values) =>
    register.mutate(
      {
        email: values.email,
        password: values.password,
        displayName: values.displayName || undefined,
      },
      {
        onSuccess: () => navigate('/quiz', { replace: true }),
        onError: (e) => {
          if (e instanceof ApiError && e.status === 409)
            form.setError('email', {
              type: 'server',
              message: 'This e-mail is already registered.',
            });
          else applyServerErrors(e, form.setError);
        },
      },
    ),
  );
  return (
    <div className="card stack" style={{ maxWidth: '28rem', margin: '0 auto' }}>
      <h1>Create account</h1>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField
          label="Display name (optional)"
          autoComplete="nickname"
          error={errors.displayName?.message}
          {...form.register('displayName')}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters."
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" loading={register.isPending}>
          Create account
        </Button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
