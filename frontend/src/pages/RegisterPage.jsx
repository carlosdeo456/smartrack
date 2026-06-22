import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNotification, NotificationCenter } from '../components/common';

const RegisterPage = () => {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'customer'
  });
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const { notifications, removeNotification, addNotification } = useNotification();
  const navigate = useNavigate();

  const updateField = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      addNotification('Account created successfully', 'success');
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
          <h1 className="text-2xl font-bold text-[var(--tw-text)] mb-2">Create your account</h1>
          <p className="text-[var(--tw-muted)]">Join SmartTrack to manage shipments.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            value={form.fullName}
            onChange={updateField('fullName')}
            placeholder="Jane Doe"
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={updateField('email')}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={updateField('password')}
            placeholder="At least 6 characters"
            required
          />
          <div>
            <label className="block text-sm font-semibold text-[var(--tw-text)] mb-2">Role</label>
            <select
              value={form.role}
              onChange={updateField('role')}
              className="w-full px-4 py-2.5 border border-[var(--tw-border2)] rounded-lg bg-[var(--tw-surface)] text-[var(--tw-text)] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-[var(--tw-accent)]"
            >
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-sm text-[var(--tw-muted)] mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--tw-accent)] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
    </div>
  );
};

export default RegisterPage;
