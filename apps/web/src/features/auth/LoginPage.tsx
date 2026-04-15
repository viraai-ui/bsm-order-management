import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '../../lib/apiClient';
import { markAuthenticated } from './auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    try {
      await login({ email, password });
      markAuthenticated();
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-hero">
        <span className="eyebrow">Precision Industrialism, via Stitch</span>
        <h1>BSM dispatch command center.</h1>
        <p>
          Built for factory staff who need urgent signals, sync visibility, and zero clutter.
        </p>
        <ul className="hero-points">
          <li>Urgent, today, tomorrow, later buckets</li>
          <li>Zoho sync visibility and pending media alerts</li>
          <li>Operator-first layout, not generic SaaS mush</li>
        </ul>
      </section>

      <section className="login-panel">
        <div className="panel-header">
          <p className="eyebrow">Internal access</p>
          <h2>Sign in to continue</h2>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input name="email" type="email" placeholder="admin@bsm.local" defaultValue="admin@bsm.local" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" placeholder="••••••••" defaultValue="ChangeMe123!" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Enter dashboard'}</button>
        </form>
      </section>
    </div>
  );
}
