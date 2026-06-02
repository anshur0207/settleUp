import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Users,
  Mail,
  Plus,
  Clock3,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  MoreVertical,
  Edit3,
  Trash2,
  Crown,
} from 'lucide-react';
import api from '../services/api.js';
import { minimizeDebts } from '../utils/smartSplit.js';
import LoadingAndErrorStates from './LoadingAndErrorStates.jsx';
import { useQueryClient } from '@tanstack/react-query';

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [group, setGroup] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');

  const currentUserId = user?.id || user?.id;
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);

  const handleToggleSmartSplit = async (e) => {
    const isEnabled = e.target.checked;
    try {
      await api.post(`/groups/${id}/smart-split/toggle`, { enabled: isEnabled });
      await loadGroup();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle smart split');
    }
  };

  const loadGroup = async () => {
    try {
      const response = await api.get(`/groups/${id}`);
      setGroup(response.data.group);
      setSettlements(response.data.settlements || []);
    } catch (err) {
      console.error('Unable to load group', err);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      const response = await api.get('/users/suggested');
      setSuggestedUsers(response.data.suggestedUsers || []);
    } catch (err) {
      console.error('Unable to load suggested users', err);
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(''); // 'expense' or 'group'
  const [targetId, setTargetId] = useState(null);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

  const handleDeleteExpense = (expenseId) => {
    setDeleteType('expense');
    setTargetId(expenseId);
    setDeleteModalOpen(true);
  };

  const handleDeleteGroup = () => {
    setDeleteType('group');
    setDeleteModalOpen(true);
  };

  const handleRemoveMember = (memberId) => {
    setDeleteType('member');
    setTargetId(memberId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteModalOpen(false);
    if (deleteType === 'expense') {
      setDeletingExpenseId(targetId);
      try {
        await api.delete(`expenses/${targetId}`);
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        await loadGroup();
      } catch (err) {
        console.error('Unable to delete expense', err);
        alert(err.response?.data?.message || 'Unable to delete expense.');
      } finally {
        setDeletingExpenseId(null);
        setTargetId(null);
      }
    } else if (deleteType === 'group') {
      try {
        await api.delete(`/groups/${id}`);
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        navigate('/groups');
      } catch (err) {
        console.error('Failed to delete group', err);
        alert(err.response?.data?.message || 'Failed to delete group.');
      }
    } else if (deleteType === 'member') {
      try {
        await api.delete(`/groups/${id}/members/${targetId}`);
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        if (String(targetId) === String(currentUserId)) {
          navigate('/groups');
        } else {
          await loadGroup();
        }
      } catch (err) {
        console.error('Failed to remove member', err);
        alert(err.response?.data?.message || 'Failed to remove member.');
      }
    }
  };

  const isAdmin = useMemo(() => {
    if (!group || !group.admins) return false;
    return group.admins.some((adminId) => String(adminId?.id || adminId) === String(currentUserId));
  }, [group, currentUserId]);

  useEffect(() => {
    if (id) {
      const init = async () => {
        setPageLoading(true);
        await Promise.all([loadGroup(), loadSuggestedUsers()]);
        setPageLoading(false);
      };
      init();
    }
  }, [id]);

  const availableSuggestions = useMemo(() => {
    if (!group || !suggestedUsers) return [];
    
    const memberEmails = group.members?.map(m => m.email?.toLowerCase()) || [];
    const pendingEmails = group.pendingMembers?.map(p => p.email?.toLowerCase()) || [];
    
    return suggestedUsers.filter(user => 
      !memberEmails.includes(user.email?.toLowerCase()) &&
      !pendingEmails.includes(user.email?.toLowerCase())
    );
  }, [group, suggestedUsers]);

  const handleAddFriend = async (email) => {
    try {
      await api.post(`/groups/${id}/members`, { email });
      await loadGroup();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Unable to add friend');
    }
  };

  const handleInviteEmail = async (event) => {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    const email = inviteEmail.trim().toLowerCase();
    const phone = invitePhone.trim();
    if (!email && !phone) {
      setError('Enter an email or phone number to invite.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/groups/${id}/members`, { email, phone, name: inviteName.trim() });
      setStatusMessage(`Member successfully added/invited.`);
      setInviteEmail('');
      setInvitePhone('');
      setInviteName('');
      await loadGroup();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDesc = () => {
    setDescInput(group?.description || '');
    setIsEditingDesc(true);
  };

  const handleSaveDesc = async () => {
    try {
      await api.put(`/groups/${id}`, { description: descInput });
      setIsEditingDesc(false);
      await loadGroup();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update description');
    }
  };

  const allExpenses = useMemo(() => {
    return (group?.expenses || [])
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [group]);

  const totalExpenses = useMemo(() => {
    return (group?.expenses || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
  }, [group]);

  const settlementItems = useMemo(() => {
    if (group?.settings?.smartSplit) {
      const netBalances = {};
      (group?.expenses || []).forEach(expense => {
        const paidBy = String(expense.paidBy?.id || expense.paidBy);
        expense.splits?.forEach(split => {
          const user = String(split.user?.id || split.user);
          const owed = split.owed ?? split.amount ?? 0;
          if (user !== paidBy && owed > 0) {
            netBalances[user] = (netBalances[user] || 0) - owed;
            netBalances[paidBy] = (netBalances[paidBy] || 0) + owed;
          }
        });
      });

      settlements.forEach(settlement => {
        const payer = String(settlement.payer?.id || settlement.payer);
        const payee = String(settlement.payee?.id || settlement.payee);
        netBalances[payer] = (netBalances[payer] || 0) + settlement.amount;
        netBalances[payee] = (netBalances[payee] || 0) - settlement.amount;
      });

      const optimized = minimizeDebts(netBalances);
      const myBalances = {};
      
      optimized.forEach(t => {
        if (t.from === String(currentUserId)) {
          myBalances[t.to] = (myBalances[t.to] || 0) - t.amount;
        } else if (t.to === String(currentUserId)) {
          myBalances[t.from] = (myBalances[t.from] || 0) + t.amount;
        }
      });

      return Object.entries(myBalances)
        .filter(([, amount]) => Math.abs(amount) > 0.01)
        .map(([memberId, amount]) => {
          const member = group?.members?.find((item) => String(item.id) === memberId);
          return {
            id: memberId,
            name: member?.name || 'Unknown',
            avatar: member?.avatar || '',
            amount: Number(amount.toFixed(2)),
            positive: amount > 0,
          };
        });
    }

    const balances = {};
    (group?.expenses || []).forEach((expense) => {
      const paidById = expense.paidBy?.id || expense.paidBy;
      if (String(paidById) === String(currentUserId)) {
        expense.splits?.forEach((split) => {
          const splitUserId = split.user?.id || split.user;
          if (String(splitUserId) !== String(currentUserId)) {
            balances[splitUserId] = (balances[splitUserId] || 0) + (split.owed ?? split.amount ?? 0);
          }
        });
      } else {
        const mySplit = expense.splits?.find(
          (split) => String(split.user?.id || split.user) === String(currentUserId)
        );
        if (mySplit) {
          balances[paidById] = (balances[paidById] || 0) - (mySplit.owed ?? mySplit.amount ?? 0);
        }
      }
    });

    settlements.forEach(settlement => {
      const payerId = String(settlement.payer?.id || settlement.payer);
      const payeeId = String(settlement.payee?.id || settlement.payee);
      
      if (payerId === String(currentUserId)) {
         balances[payeeId] = (balances[payeeId] || 0) + settlement.amount;
      } else if (payeeId === String(currentUserId)) {
         balances[payerId] = (balances[payerId] || 0) - settlement.amount;
      }
    });

    return Object.entries(balances)
      .filter(([, amount]) => Math.abs(amount) > 0.01)
      .map(([memberId, amount]) => {
        const member = group?.members?.find((item) => String(item.id) === memberId);
        return {
          id: memberId,
          name: member?.name || 'Unknown',
          avatar: member?.avatar || '',
          amount: Number(amount.toFixed(2)),
          positive: amount > 0,
        };
      });
  }, [group, settlements, currentUserId]);

  const { youAreOwed, youOwe } = useMemo(() => {
    let owed = 0;
    let owe = 0;

    settlementItems.forEach(item => {
      if (item.amount > 0) {
        owed += item.amount;
      } else if (item.amount < 0) {
        owe += Math.abs(item.amount);
      }
    });

    return { youAreOwed: owed, youOwe: owe };
  }, [settlementItems]);

  const handleSettleNow = async (memberId, amount) => {
    if (window.confirm(`Are you sure you want to record a settlement of ₹${amount}?`)) {
      try {
        await api.post('settlements', {
          payee: memberId,
          amount: Number(amount),
          groupId: id,
          note: 'Group Settlement',
        });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        await loadGroup();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Unable to settle payment.');
      }
    }
  };

  if (pageLoading) {
    return <LoadingAndErrorStates status="loading" message="Loading group details..." />;
  }

  return (
    <div className="min-h-screen bg-[#f6f9f7]">
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-gray-900">
              {deleteType === 'group' ? 'Delete Group?' : deleteType === 'member' ? (String(targetId) === String(currentUserId) ? 'Leave Group?' : 'Remove Member?') : 'Delete Expense?'}
            </h3>
            <p className="text-gray-500 mt-3 text-lg leading-relaxed">
              {deleteType === 'group'
                ? 'Are you sure you want to delete this group? All expenses inside this group will be deleted. This action cannot be undone.'
                : deleteType === 'member'
                ? (String(targetId) === String(currentUserId) ? 'Are you sure you want to leave this group? You will no longer see its expenses.' : 'Are you sure you want to remove this member from the group?')
                : 'Are you sure you want to delete this expense? This action cannot be undone.'}
            </p>
            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition shadow-lg shadow-red-100"
              >
                {deleteType === 'member' ? (String(targetId) === String(currentUserId) ? 'Leave' : 'Remove') : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setTargetId(null);
                }}
                className="flex-1 h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {addMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Add Members</h3>
            <form onSubmit={handleInviteEmail} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  type="text"
                  placeholder="John Doe"
                  className="w-full mt-2 h-14 rounded-xl border border-gray-200 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    placeholder="john@example.com"
                    className="w-full mt-2 h-14 rounded-xl border border-gray-200 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                  <input
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    type="tel"
                    placeholder="+1234567890"
                    className="w-full mt-2 h-14 rounded-xl border border-gray-200 px-4 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">Please provide an email OR phone number.</p>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {statusMessage && <p className="text-sm text-emerald-700">{statusMessage}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-bold shadow-lg disabled:opacity-60"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </form>

            {availableSuggestions.length > 0 && (
              <div className="mt-8 border-t border-gray-100 pt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Suggested Contacts</h2>
                <div className="grid gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {availableSuggestions.map(friend => (
                    <div key={friend.id} className="rounded-2xl bg-gray-50 p-3 border border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shadow-sm">
                            {friend.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{friend.name}</p>
                          <p className="text-xs text-gray-500">{friend.email}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleAddFriend(friend.email)}
                        className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => setAddMemberModalOpen(false)}
              className="w-full mt-4 h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <p className="text-emerald-600 font-bold uppercase tracking-[4px] text-sm">Group Details</p>
            <h1 className="text-5xl font-black text-gray-900 mt-2">{group?.name || 'Loading...'}</h1>
            <p className="text-gray-500 mt-3 text-lg">Manage trip expenses, balances and members.</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-3 cursor-pointer bg-white px-5 h-14 rounded-2xl border border-gray-200 shadow-sm hover:bg-gray-50 transition">
              <span className="font-semibold text-gray-700">Smart Split</span>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={group?.settings?.smartSplit || false} 
                  onChange={handleToggleSmartSplit} 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </div>
            </label>
            <button
              onClick={() => setAddMemberModalOpen(true)}
              className="h-14 px-6 rounded-2xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition font-semibold shadow-sm flex items-center gap-3 bg-white"
            >
              <Users size={20} />
              Add Member
            </button>
            <button
              onClick={() => navigate(`/expenses/new?groupId=${id}`)}
              className="h-14 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shadow-lg flex items-center gap-3"
            >
              <Plus size={20} />
              Add Expense
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleDeleteGroup}
                className="hidden lg:flex h-14 px-5 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition font-semibold items-center gap-2 shadow-sm"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRemoveMember(currentUserId)}
              className="hidden lg:flex h-14 px-5 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition font-semibold items-center gap-2 shadow-sm"
            >
              Leave
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <SummaryCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString()}`} icon={<Wallet size={28} />} />
          <SummaryCard title="You Are Owed" value={`₹${youAreOwed.toLocaleString()}`} positive icon={<ArrowDownLeft size={28} />} />
          <SummaryCard title="You Owe" value={`₹${youOwe.toLocaleString()}`} negative icon={<ArrowUpRight size={28} />} />
        </div>

        <div className="grid xl:grid-cols-3 gap-6 md:gap-8">
          <div className="xl:col-span-2 space-y-6 md:space-y-8">
            <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-7 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">Group Expenses</h2>
                  <p className="text-gray-500 mt-2 text-lg">All trip expenses and payments.</p>
                </div>
                <button className="w-12 h-12 rounded-2xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center">
                  <MoreVertical size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allExpenses.length > 0 ? (
                  allExpenses.map((expense, index) => (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 hover:bg-gray-50 transition" key={expense.id || index}>
                      <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-2xl md:rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <Receipt size={24} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{expense.title}</h3>
                          <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-2 text-xs md:text-sm text-gray-500">
                            <span className="truncate">Paid by {expense.paidBy?.name || 'Unknown'}</span>
                            <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-gray-300" />
                            <span className="shrink-0">{new Date(expense.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center mt-2 md:mt-0 gap-3">
                        <h2 className={`text-2xl md:text-3xl font-black ${String(expense.paidBy?.id || expense.paidBy) === String(currentUserId) ? 'text-emerald-500' : 'text-red-500'}`}>
                          ₹{expense.amount?.toLocaleString()}
                        </h2>
                        {(String(expense.createdBy?.id || expense.createdBy) === String(currentUserId) || String(expense.paidBy?.id || expense.paidBy) === String(currentUserId) || isAdmin) && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/expenses/edit/${expense.id}`)}
                              className="inline-flex items-center justify-center h-10 md:h-auto gap-2 rounded-xl md:rounded-2xl border border-gray-200 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                            >
                              <Edit3 size={16} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetId(expense.id);
                                setDeleteType('expense');
                                setDeleteModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center h-10 md:h-auto gap-2 rounded-xl md:rounded-2xl border border-rose-200 bg-rose-50 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-rose-600 hover:bg-rose-100 transition"
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No expenses yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-7 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">Pending Settlements</h2>
                  <p className="text-gray-500 mt-2 text-lg">Clear pending balances with members.</p>
                </div>
              </div>

              <div className="space-y-5">
                {settlementItems.length > 0 ? (
                  settlementItems.map((item) => (
                    <SettlementItem 
                      key={item.id} 
                      name={item.name} 
                      avatar={item.avatar}
                      amount={`₹${Math.abs(item.amount).toLocaleString()}`} 
                      positive={item.positive} 
                      onSettle={() => handleSettleNow(item.id, Math.abs(item.amount))}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No pending settlements yet. Add an expense to start splitting.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 md:space-y-8">
            <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-7 shadow-lg border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Group Summary</h2>
              <div className="space-y-5">
                <InfoCard title="Members" value={`${group?.members?.length || 0} Members`} icon={<Users size={20} />} />
                <InfoCard title="Created" value={group?.createdAt ? new Date(group.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '–'} icon={<Clock3 size={20} />} />
                
                {isEditingDesc ? (
                  <div className="p-5 rounded-3xl bg-gray-50 flex items-start gap-4 border border-emerald-200">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                      <Edit3 size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-emerald-600 text-sm font-bold uppercase tracking-wider mb-2">Edit Description</p>
                      <textarea
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                        placeholder="Add a description for your group..."
                        className="w-full rounded-2xl border border-gray-200 p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3 resize-none"
                        rows="2"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveDesc} className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 text-sm">Save</button>
                        <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 text-sm">Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-3xl bg-gray-50 flex items-center justify-between gap-4 group/desc">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                        <Wallet size={20} />
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Description</p>
                        <h3 className="text-xl font-bold text-gray-900 mt-1">{group?.description || <span className="text-gray-400 font-normal italic">No description</span>}</h3>
                      </div>
                    </div>
                    <button onClick={handleEditDesc} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition opacity-0 group-hover/desc:opacity-100">
                      <Edit3 size={18} />
                    </button>
                  </div>
                )}

              </div>
              <button
                onClick={() => navigate(`/groups/${id}/balances`)}
                className="mt-6 w-full h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition font-bold text-lg flex items-center justify-center gap-2"
              >
                View All Balances
              </button>
            </div>

            <div className="bg-white rounded-[32px] p-7 shadow-lg border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Group Members</h2>
              <div className="grid gap-3">
                {group?.members?.map((member) => (
                  <div key={member.id} className="rounded-3xl bg-gray-50 p-4 border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg shadow-sm">
                          {member.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          {group?.admins?.some((adminId) => String(adminId?.id || adminId) === String(member.id)) && (
                            <div className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md flex items-center gap-1" title="Group Admin">
                              <Crown size={12} strokeWidth={3} />
                              <span className="text-[10px] font-bold uppercase tracking-wide">Admin</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    {isAdmin && String(member.id) !== String(currentUserId) && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-sm font-semibold text-rose-500 hover:text-rose-600 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {!group?.members?.length && <p className="text-sm text-gray-500">No members yet.</p>}
              </div>
            </div>

          </div>
        </div>

        <div className="mt-10 pt-8 pb-20 lg:pb-0 border-t border-rose-100 lg:hidden">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Danger Zone</h2>
          <div className="flex items-center gap-4 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={handleDeleteGroup}
                className="h-12 md:h-14 px-6 rounded-xl md:rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition font-semibold flex items-center gap-3"
              >
                <Trash2 size={20} />
                Delete Group
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRemoveMember(currentUserId)}
              className="h-12 md:h-14 px-6 rounded-xl md:rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition font-semibold flex items-center gap-3"
            >
              Leave Group
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};

export default GroupDetails;

function SidebarItem({ emoji, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-16 rounded-2xl flex items-center gap-4 px-5 font-semibold text-lg transition hover:bg-emerald-50 text-gray-700"
    >
      <span className="text-2xl">{emoji}</span>
      {title}
    </button>
  );
}

function SummaryCard({ title, value, icon, positive, negative }) {
  return (
    <div className="bg-white rounded-2xl md:rounded-[28px] p-5 md:p-7 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm md:text-base text-gray-500">{title}</p>
          <h2 className={`text-2xl md:text-4xl font-black mt-1 md:mt-2 ${positive ? 'text-emerald-500' : negative ? 'text-red-500' : 'text-gray-900'}`}>
            {value}
          </h2>
        </div>
        <div className={`w-12 h-12 md:w-16 h-16 rounded-xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl ${positive ? 'bg-emerald-100 text-emerald-600' : negative ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value, icon }) {
  return (
    <div className="p-5 rounded-3xl bg-gray-50 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <h3 className="text-xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
}

function SettlementItem({ name, avatar, amount, positive, onSettle }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 hover:bg-gray-50 transition">
      <div className="flex items-center gap-3 md:gap-4">
        {avatar ? (
          <img src={avatar} alt={name} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl object-cover shadow-sm" />
        ) : (
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 shadow-sm text-lg md:text-xl font-bold">
            {name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div>
          <h3 className="text-lg md:text-xl font-black text-gray-900">{name}</h3>
          <p className={`text-xs md:text-sm font-bold mt-0.5 md:mt-1 ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
            {positive ? `${name} owes you` : `You owe ${name}`}
          </p>
        </div>
      </div>
      <div className="text-left md:text-right flex flex-row md:flex-col justify-between items-center md:items-end">
        <h2 className={`text-xl md:text-2xl font-black ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>{positive ? `+${amount}` : `-${amount}`}</h2>
        <button onClick={onSettle} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition">Settle Now</button>
      </div>
    </div>
  );
}

