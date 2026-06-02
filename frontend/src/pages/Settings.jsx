import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import MobileTopMenu from '../components/MobileTopMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import LoadingAndErrorStates from './LoadingAndErrorStates.jsx';

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    currency: 'INR',
    avatar: '',
    settings: {
      pushNotifications: true,
      darkMode: false,
      twoFactor: false,
      mobileAlerts: true,
    },
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportGroups, setExportGroups] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('users/me');
        const userData = response.data.user;
        setProfile((prev) => ({
          ...prev,
          name: userData.name || '',
          username: userData.username || '',
          email: userData.email || '',
          phone: userData.phone || '',
          currency: userData.currency || 'INR',
          avatar: userData.avatar || '',
          settings: {
            ...prev.settings,
            ...userData.settings,
          },
        }));
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Unable to load profile');
      } finally {
        setPageLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle = (field) => {
    setProfile((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: !prev.settings[field],
      },
    }));
  };

  const handleSaveProfile = async () => {
    setError('');
    setStatusMessage('');
    if (!profile.name.trim()) {
      setError('Name cannot be blank');
      return;
    }
    setSaving(true);

    try {
      const payload = {
        name: profile.name,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
        currency: profile.currency,
        avatar: profile.avatar,
        settings: profile.settings,
      };
      const response = await api.put('users/me', payload);
      const updatedUser = response.data.user;
      setProfile((prev) => ({
        ...prev,
        name: updatedUser.name || prev.name,
        username: updatedUser.username || prev.username,
        email: updatedUser.email || prev.email,
        phone: updatedUser.phone || prev.phone,
        currency: updatedUser.currency || prev.currency,
        avatar: updatedUser.avatar || prev.avatar,
        settings: {
          ...prev.settings,
          ...updatedUser.settings,
        },
      }));
      updateUser({
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        currency: updatedUser.currency,
        avatar: updatedUser.avatar,
      });
      setStatusMessage('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError('');
    setStatusMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill all password fields');
      return;
    }
    if (!/^(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/.test(newPassword)) {
      setError('New password must be at least 6 characters and include a special character');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords must match');
      return;
    }
    setSaving(true);
    try {
      const response = await api.put('users/me', {
        currentPassword,
        newPassword,
      });
      updateUser({ ...response.data.user });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError('Image must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('avatar-upload').click();
  };

  const handleOpenExport = async () => {
    try {
      const response = await api.get('groups');
      setExportGroups(response.data.groups || []);
      setExportModalOpen(true);
    } catch (err) {
      setError('Unable to load groups for export');
    }
  };

  const handleExportGroup = async (groupId, groupName) => {
    setExporting(true);
    try {
      const response = await api.get(`groups/${groupId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export-${groupName.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportModalOpen(false);
    } catch (err) {
      alert('Unable to export group data');
    } finally {
      setExporting(false);
    }
  };

  if (pageLoading) {
    return <LoadingAndErrorStates status="loading" message="Loading settings..." />;
  }

  return (
    <div className="min-h-screen bg-[#f6f9f7] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid lg:grid-cols-4 gap-6">


          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-row items-start justify-between gap-4 md:gap-5">
              <div className="flex-1 min-w-0">
                <p className="text-emerald-600 font-bold uppercase tracking-[4px] text-[10px] md:text-sm">User Settings</p>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 mt-1 md:mt-2 truncate">Settings ⚙️</h1>
                <p className="text-gray-500 mt-1 md:mt-3 text-sm md:text-lg">Manage your profile, security and app preferences.</p>
              </div>
              <MobileTopMenu />
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-lg border border-gray-100">
              <div className="flex flex-col xl:flex-row gap-10">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt="profile"
                        className="w-40 h-40 rounded-[35px] object-cover"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-[35px] bg-emerald-100 flex items-center justify-center text-5xl text-emerald-600 font-bold">
                        {profile.name?.charAt(0).toUpperCase() || 'S'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      className="absolute bottom-3 right-3 w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 transition"
                    >
                      📷
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="mt-5 h-12 px-5 rounded-2xl border border-gray-200 hover:bg-gray-50 transition font-semibold"
                  >
                    Change Photo
                  </button>
                </div>

                <div className="flex-1 grid md:grid-cols-2 gap-5">
                  <Input label="Full Name" value={profile.name} onChange={(value) => handleChange('name', value)} />
                  <Input label="Username" value={profile.username} onChange={(value) => handleChange('username', value)} />
                  <Input label="Email" value={profile.email} onChange={(value) => handleChange('email', value)} disabled />
                  <Input label="Phone" value={profile.phone} onChange={(value) => handleChange('phone', value)} />
                  <Input label="Country" value="India" disabled />
                  <Input label="Currency" value="INR" disabled />
                </div>
              </div>

              <div className="flex gap-4 mt-8 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="h-14 px-8 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg hover:bg-emerald-600 transition"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setProfile((prev) => ({ ...prev }))}
                  className="h-14 px-8 rounded-2xl border border-gray-200 font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-[32px] p-8 shadow-lg border border-gray-100">
                <h2 className="text-3xl font-black text-gray-900 mb-6">Change Password 🔐</h2>
                <div className="space-y-5">
                  <PasswordField label="Current Password" value={currentPassword} onChange={setCurrentPassword} />
                  <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} />
                  <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} />
                </div>
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={saving}
                  className="mt-8 w-full h-14 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg hover:bg-emerald-600 transition"
                >
                  Update Password
                </button>
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-[32px] p-8 shadow-lg border border-gray-100">
                  <h2 className="text-3xl font-black text-gray-900 mb-5">Export Data 📁</h2>
                  <button 
                    type="button"
                    onClick={handleOpenExport}
                    className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg hover:bg-emerald-600 transition"
                  >
                    Export Excel Report
                  </button>
                </div>
                <div className="bg-white rounded-[32px] p-8 shadow-lg border border-red-100">
                  <h2 className="text-3xl font-black text-gray-900 mb-5">Danger Zone 🚨</h2>
                  <div className="space-y-4">

                    <button
                      type="button"
                      onClick={logout}
                      className="w-full h-14 rounded-2xl bg-red-500 text-white font-bold shadow-lg hover:bg-red-600 transition"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>


            </div>



            {(statusMessage || error) && (
              <div className={`rounded-3xl p-5 ${error ? 'bg-rose-50 border-2 border-rose-200 text-rose-700' : 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700'}`}>
                {error || statusMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl p-8 relative max-h-[80vh] overflow-y-auto">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Select Group to Export 📁</h2>
            <div className="space-y-4">
              {exportGroups.length > 0 ? exportGroups.map(group => (
                <button
                  key={group._id}
                  onClick={() => handleExportGroup(group._id, group.name)}
                  disabled={exporting}
                  className="w-full p-5 rounded-2xl border border-gray-200 hover:bg-gray-50 transition text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">
                      {group.icon || '👥'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.expenseCount || 0} Expenses</p>
                    </div>
                  </div>
                  <span className="text-emerald-500 font-bold">{exporting ? 'Exporting...' : 'Export Excel'}</span>
                </button>
              )) : (
                <p className="text-gray-500 text-center py-5">No groups available to export.</p>
              )}
            </div>
            <button
              onClick={() => setExportModalOpen(false)}
              className="mt-6 w-full h-14 rounded-2xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 text-center relative">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-500 mb-6">Your password has been updated successfully.</p>
            <button
              onClick={() => setPasswordModalOpen(false)}
              className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg hover:bg-emerald-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function NavItem({ title, emoji, active }) {
  return (
    <button
      className={`w-full h-14 rounded-2xl flex items-center gap-4 px-5 font-semibold transition ${active ? 'bg-emerald-500 text-white' : 'hover:bg-emerald-50 text-gray-700'
        }`}
    >
      <span>{emoji}</span>
      {title}
    </button>
  );
}

function Input({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">{label}</label>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full h-14 rounded-2xl border border-gray-200 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="mt-3 w-full h-14 rounded-2xl border border-gray-200 px-5 focus:outline-none focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
}

function Toggle({ title, enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full p-5 rounded-3xl border border-gray-100 hover:bg-gray-50 transition"
    >
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      <div className={`w-14 h-8 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}>
        <span className={`block h-6 w-6 rounded-full bg-white shadow transform transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </button>
  );
}

function PaymentCard({ title, value }) {
  return (
    <div className="p-5 rounded-3xl border border-gray-100 hover:bg-gray-50 transition flex items-center justify-between">
      <div>
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <p className="text-gray-500 mt-1">{value}</p>
      </div>
      <span className="text-gray-400">›</span>
    </div>
  );
}

export default Settings;
