import { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signInDemoUser } from './auth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signInDemoUser();
    navigate(redirectTo, { replace: true });
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
            <span>Username</span>
            <input name="username" type="text" placeholder="dispatch.operator" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" placeholder="••••••••" required />
          </label>
          <button type="submit">Enter dashboard</button>
        </form>
      </section>
    </div>
  );
}
