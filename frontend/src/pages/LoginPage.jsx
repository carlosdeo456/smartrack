import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNotification, NotificationCenter } from '../components/common';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { notifications, removeNotification, addNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      addNotification('Logged in successfully', 'success');
      navigate('/');
    } catch (error) {
      addNotification(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="transitwatch-app min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-2">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--tw-accent)] text-white text-xl mb-4">
            🚚
          </div>
          <h1 className="text-2xl font-bold text-[var(--tw-text)] mb-2">Sign in to SmartTrack</h1>
          <p className="text-[var(--tw-muted)]">Track parcels and monitor sensors in real time.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-sm text-[var(--tw-muted)] mt-6 text-center">
          No account?{' '}
          <Link to="/register" className="text-[var(--tw-accent)] font-semibold hover:underline">
            Create one
          </Link>
        </p>
        <p className="text-sm text-[var(--tw-muted)] mt-3 text-center">
          <Link to="/track" className="text-[var(--tw-accent)] font-semibold hover:underline">
            Track a parcel live →
          </Link>
        </p>
        <p className="text-xs text-[var(--tw-dim)] mt-4 text-center">
          Demo: admin@smartrack.com / admin123
        </p>
      </Card>
      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
    </div>
  );
};

export default LoginPage;
