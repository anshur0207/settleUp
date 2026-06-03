import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  Key,
  FolderOpen,
  UserPlus,
  UserMinus,
  Search,
  Trash2,
} from 'lucide-react';
import api from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [resetModal, setResetModal] = useState({ isOpen: false, user: null, newPassword: '' });
  const [addMemberModal, setAddMemberModal] = useState({ isOpen: false, group: null, email: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, groupsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/groups')
      ]);
      setUsers(usersRes.data);
      setGroups(groupsRes.data);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/users/${resetModal.user.id}/reset-password`, {
        newPassword: resetModal.newPassword,
      });
      alert('Password reset successfully');
      setResetModal({ isOpen: false, user: null, newPassword: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleAddMember = async (e, userEmail) => {
    if (e) e.preventDefault();
    try {
      await api.post(`/admin/groups/${addMemberModal.group.id}/members`, {
        email: userEmail || addMemberModal.email,
      });
      alert('User added to group');
      setAddMemberModal({ isOpen: false, group: null, email: '' });
      fetchData(); // Refresh groups
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to add member');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('WARNING: Are you sure you want to completely delete this group? All associated expenses, splits, and members will be permanently erased!')) return;
    try {
      await api.delete(`/admin/groups/${groupId}`);
      alert('Group and all associated expenses deleted successfully');
      fetchData(); // Refresh groups
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleRemoveMember = async (groupId, userId) => {
    if (!window.confirm('Are you sure you want to remove this user from the group?')) return;
    try {
      await api.delete(`/admin/groups/${groupId}/members/${userId}`);
      alert('User removed from group');
      fetchData(); // Refresh groups
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-zinc-400 text-sm">System management and overrides</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'users' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Users size={18} /> Users
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'groups' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <FolderOpen size={18} /> Groups
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading admin data...</div>
      ) : activeTab === 'users' ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-zinc-900/50 text-zinc-400 text-sm border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4 text-zinc-200">{u.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                  <td className="px-6 py-4">
                    {u.isAdmin ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Admin</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">User</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setResetModal({ isOpen: true, user: u, newPassword: '' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                    >
                      <Key size={14} /> Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{g.name}</h3>
                  <p className="text-zinc-400 text-sm">{g.members.length} members</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddMemberModal({ isOpen: true, group: g, email: '' })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-sm transition-colors"
                  >
                    <UserPlus size={16} /> Add Member
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(g.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors"
                  >
                    <Trash2 size={16} /> Delete Group
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {g.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-zinc-800/30 p-3 rounded-lg border border-zinc-800/50">
                    <div>
                      <p className="text-zinc-200 text-sm font-medium">{m.user.name}</p>
                      <p className="text-zinc-500 text-xs">{m.user.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(g.id, m.userId)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove from group"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
            <p className="text-zinc-400 mb-6 text-sm">
              Enter a new password for <strong className="text-white">{resetModal.user.name}</strong>.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={resetModal.newPassword}
                  onChange={(e) => setResetModal({ ...resetModal, newPassword: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModal({ isOpen: false, user: null, newPassword: '' })}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <h2 className="text-xl font-bold text-white mb-2">Add User to Group</h2>
            <p className="text-zinc-400 mb-4 text-sm">
              Adding to <strong className="text-white">{addMemberModal.group.name}</strong>
            </p>
            
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                value={addMemberModal.email}
                onChange={(e) => setAddMemberModal({ ...addMemberModal, email: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Search by name or email..."
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px] bg-zinc-800/30 rounded-xl border border-zinc-800/50 p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700">
              {users
                .filter(u => 
                  u.name.toLowerCase().includes(addMemberModal.email.toLowerCase()) || 
                  u.email.toLowerCase().includes(addMemberModal.email.toLowerCase())
                )
                .map(u => {
                  const isMember = addMemberModal.group.members.some(m => m.userId === u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors">
                      <div className="truncate pr-4">
                        <p className="text-sm font-medium text-white truncate">{u.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                      </div>
                      {isMember ? (
                        <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">Member</span>
                      ) : (
                        <button
                          onClick={() => handleAddMember(null, u.email)}
                          className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors shrink-0"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex gap-3 pt-4 shrink-0 mt-2">
              <button
                type="button"
                onClick={() => setAddMemberModal({ isOpen: false, group: null, email: '' })}
                className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
