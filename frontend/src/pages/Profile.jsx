import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

import SectionCard from '../components/SectionCard.jsx';

const Profile = () => {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    try {
      await api.put('users/me', { name });
      setMessage('Profile updated');
    } catch (err) {
      setMessage('Unable to update');
    }
  };

  return (
    <div className="pb-28 pt-6 sm:pb-12">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-600">Profile</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Your account</h1>
        </div>

        <SectionCard title="Account details">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Email</label>
              <input value={email} disabled className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500" />
            </div>
            <button onClick={handleSave} className="w-full rounded-3xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">Save changes</button>
            {message && <p className="text-sm text-emerald-600">{message}</p>}
            <button onClick={logout} className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Logout</button>
          </div>
        </SectionCard>
      </div>

    </div>
  );
};

export default Profile;
