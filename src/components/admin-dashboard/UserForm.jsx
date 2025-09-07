import React, { useState } from 'react';
import { Button } from '@/components/ui';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
};

const UserForm = ({ onSubmit }) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit(form);
      setForm(initialForm);
    } catch (err) {
      setError(err.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <h3>Add User</h3>
      <div>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handleChange} required />
      </div>
      <div>
        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} required />
      </div>
      <div>
        <label>Password</label>
        <input name="password" type="password" value={form.password} onChange={handleChange} required />
      </div>
      <div>
        <label>Role</label>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add User'}</Button>
    </form>
  );
};

export default UserForm;
