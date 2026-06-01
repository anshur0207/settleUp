import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bike,
  Home,
  LayoutDashboard,
  Plus,
  Receipt,
  Search,
  Settings,
  Users,
  Plane,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import api from '../services/api.js';
import MobileTopMenu from '../components/MobileTopMenu.jsx';
import LoadingAndErrorStates from './LoadingAndErrorStates.jsx';

const iconByCategory = {
  Trip: <Plane size={26} />,
  Flatmates: <Home size={26} />,
  Ride: <Bike size={26} />,
};

const defaultColorClasses = [
  'bg-emerald-100 text-emerald-600',
  'bg-orange-100 text-orange-600',
  'bg-blue-100 text-blue-600',
  'bg-violet-100 text-violet-600',
];

const navItems = [
  { label: 'Dashboard', icon: <LayoutDashboard size={22} />, path: '/dashboard' },
  { label: 'Friends', icon: <Users size={22} />, path: '/friends' },
  { label: 'Expenses', icon: <Receipt size={22} />, path: '/expenses/new' },
  { label: 'Analytics', icon: <BarChart3 size={22} />, path: '/analytics' },
  { label: 'Groups', icon: <Users size={22} />, path: '/groups' },
  { label: 'Settings', icon: <Settings size={22} />, path: '/settings' },
];

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Trip');
  const [newIcon, setNewIcon] = useState('👥');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const loadGroups = async () => {
    try {
      setLoadError('');
      setIsFetching(true);
      const response = await api.get('groups');
      setGroups(response.data.groups || []);
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.data?.message || 'Unable to load groups. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const query = search.trim().toLowerCase();
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        (group.category || '').toLowerCase().includes(query)
    );
  }, [search, groups]);

  const totalReceived = useMemo(
    () => groups.reduce((sum, group) => sum + Math.max(group.balance || 0, 0), 0),
    [groups]
  );

  const totalOwed = useMemo(
    () => groups.reduce((sum, group) => sum + Math.max(-(group.balance || 0), 0), 0),
    [groups]
  );

  const formatCurrency = (value) => {
    const amount = typeof value === 'number' ? value : 0;
    const formatted = Math.abs(amount).toLocaleString('en-IN');
    return `${amount < 0 ? '-' : ''}₹${formatted}`;
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!newName.trim()) {
      setError('Group name is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('groups', {
        name: newName.trim(),
        description: newDescription.trim(),
        category: newCategory.trim() || 'Trip',
        icon: newIcon.trim() || '👥',
      });
      setGroups((current) => [response.data.group, ...current]);
      setNewName('');
      setNewDescription('');
      setNewCategory('Trip');
      setNewIcon('👥');
      setShowCreate(false);
      setStatus('Group created successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create group');
    } finally {
      setLoading(false);
    }
  };

  const getColor = (index) => defaultColorClasses[index % defaultColorClasses.length];

  if (isFetching && groups.length === 0) {
    return <LoadingAndErrorStates status="loading" message="Loading your groups..." />;
  }

  return (
    <div className="min-h-screen bg-[#f6f9f7] flex flex-col lg:pl-0">
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-row items-start justify-between gap-4 md:gap-5 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 truncate">Groups 👥</h1>
            <p className="text-gray-500 mt-1 md:mt-2 text-sm md:text-lg">Manage shared expenses with your groups.</p>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="h-10 md:h-14 px-3 md:px-6 rounded-xl md:rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shadow-lg flex items-center gap-1 md:gap-3 text-sm md:text-base"
            >
              <Plus size={18} className="md:w-5 md:h-5" />
              <span>{showCreate ? 'Cancel' : 'New'}</span>
              <span className="hidden md:inline">Group</span>
            </button>
          </div>
          <MobileTopMenu />
        </div>

        {loadError && (
          <div className="mb-6 rounded-[30px] border border-red-200 bg-red-50 p-5 text-red-700">
            {loadError}
          </div>
        )}

        {showCreate && (
          <div className="bg-white rounded-[32px] p-7 shadow-lg border border-gray-100 mb-8">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="grid gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Group name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Goa Riders"
                  className="w-full rounded-3xl border border-gray-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows="3"
                  placeholder="Describe this group"
                  className="w-full rounded-3xl border border-gray-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Trip"
                    className="w-full rounded-3xl border border-gray-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Icon</label>
                  <input
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    placeholder="🏍️"
                    maxLength={2}
                    className="w-full rounded-3xl border border-gray-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {status && <p className="text-sm text-emerald-700">{status}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
              >
                {loading ? 'Creating group...' : 'Create Group'}
              </button>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <SummaryCard title="Total Groups" value={`${groups.length}`} emoji="👥" />
          <SummaryCard title="You Are Owed" value={formatCurrency(totalReceived)} positive icon={<ArrowDownLeft size={28} />} />
          <SummaryCard title="You Owe" value={formatCurrency(totalOwed)} negative icon={<ArrowUpRight size={28} />} />
        </div>



        <div className="grid xl:grid-cols-2 gap-6">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group, index) => (
              <div
                key={group._id}
                className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-7 shadow-lg border border-gray-100 hover:shadow-2xl transition"
              >
                <div className="flex flex-row items-center justify-between gap-4 md:gap-0">
                  <div className="flex items-center gap-3 md:gap-5 min-w-0">
                    <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl shrink-0 ${getColor(index)}`}>
                      {group.icon || iconByCategory[group.category] || '👥'}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl md:text-3xl font-black text-gray-900 truncate">{group.name}</h2>
                      <p className="text-gray-500 text-xs md:text-lg mt-0.5 md:mt-2 truncate">
                        {group.members?.length || 0} Members • {group.expenseCount || 0} Expenses
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <h2 className={`text-xl md:text-3xl font-black ${group.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(group.balance)}
                    </h2>
                    <p className="text-gray-400 text-[10px] md:text-sm mt-0.5 md:mt-1">Current Balance</p>
                  </div>
                </div>

                <div className="flex items-center mt-6 md:mt-8">
                  {group.members?.slice(0, 3).map((member, idx) => (
                    <div
                      key={member._id || idx}
                      className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl border-[3px] md:border-4 border-white shrink-0 bg-emerald-100 flex items-center justify-center overflow-hidden shadow-sm ${idx > 0 ? '-ml-2 md:-ml-3' : ''
                        }`}
                      style={{ zIndex: 10 - idx }}
                    >
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name || 'avatar'} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-emerald-600 font-bold text-sm md:text-lg">{member.name?.charAt(0).toUpperCase() || 'U'}</span>
                      )}
                    </div>
                  ))}
                  {group.members?.length > 3 && (
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gray-100 border-[3px] md:border-4 border-white -ml-2 md:-ml-3 flex items-center justify-center font-bold text-xs md:text-base text-gray-600 shadow-sm z-0">
                      +{group.members.length - 3}
                    </div>
                  )}
                </div>

                <div className="flex flex-row gap-3 md:grid md:grid-cols-2 md:gap-4 mt-6 md:mt-8">
                  <button
                    type="button"
                    onClick={() => navigate(`/groups/${group._id}`)}
                    className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white text-sm md:text-base font-semibold shadow-md"
                  >
                    View Group
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/expenses/new?groupId=${group._id}`)}
                    className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl border border-gray-200 hover:bg-gray-50 transition text-sm md:text-base font-semibold text-gray-700"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-[32px] p-10 shadow-lg border border-gray-100 text-center text-gray-500">
              No groups found. Create one to start tracking shared expenses.
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

function SummaryCard({ title, value, emoji, icon, positive, negative }) {
  return (
    <div className="bg-white rounded-2xl md:rounded-[28px] p-5 md:p-7 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-base text-gray-500">{title}</p>
          <h2 className={`text-2xl md:text-4xl font-black mt-1 md:mt-2 ${positive ? 'text-emerald-500' : negative ? 'text-red-500' : 'text-gray-900'}`}>
            {value}
          </h2>
        </div>
        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl ${positive ? 'bg-emerald-100 text-emerald-600' : negative ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600'}`}>
          {emoji || icon}
        </div>
      </div>
    </div>
  );
}
