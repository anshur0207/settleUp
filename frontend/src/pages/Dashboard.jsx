import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Edit, Trash2, Menu, X } from 'lucide-react';
import api from '../services/api.js';
import LoadingAndErrorStatus from './LoadingAndErrorStates.jsx';

export default function SettleUpDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userId = user?._id || user?.id;
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [friendBalances, setFriendBalances] = useState([]);
  const [summary, setSummary] = useState({ total: 0, owe: 0, owed: 0 });
  const [status, setStatus] = useState('loading');
  const [statusMessage, setStatusMessage] = useState('Fetching latest expenses, balances and groups.');
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [friendReqCount, setFriendReqCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [deletingExpenseId, setDeletingExpenseId] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const handleDeleteExpense = (expenseId) => {
    setExpenseToDelete(expenseId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeletingExpenseId(expenseToDelete);
    setDeleteModalOpen(false);
    try {
      await api.delete(`expenses/${expenseToDelete}`);
      await loadDashboard();
    } catch (err) {
      console.error('Unable to delete expense', err);
      alert(err.response?.data?.message || 'Unable to delete expense.');
    } finally {
      setDeletingExpenseId(null);
      setExpenseToDelete(null);
    }
  };

  const loadDashboard = async () => {
    setStatus('loading');
    setStatusMessage('Fetching latest expenses, balances and groups.');

    try {
      // Single API call replaces 5 separate calls
      const { data } = await api.get('dashboard');
      
      const groupData = data.groups || [];
      const expenseData = data.expenses || [];
      const settlementData = data.settlements || [];

      setUnreadNotifCount(data.unreadNotificationCount || 0);

      const friendReqData = data.friendRequests || [];
      setFriendReqCount(friendReqData.length);

      setGroups(groupData);

      const userId = user?._id || user?.id;
      const balanceMap = {};

      if (expenseData.length === 0) {
        setSummary({ total: 0, owe: 0, owed: 0 });
        setFriendBalances([]);
        setExpenses([]);
        setStatus('success');
        setStatusMessage('Data loaded successfully.');
        return;
      }

      expenseData.forEach((expense) => {
        const paidById = expense.paidBy?.id || expense.paidBy?._id || expense.paidBy;
        const splitForUser = expense.splits?.find((split) => String(split.user?.id || split.user?._id || split.user) === String(userId));

        if (String(paidById) === String(userId)) {
          expense.splits
            .filter((split) => String(split.user?.id || split.user?._id || split.user) !== String(userId))
            .forEach((split) => {
              const splitUserId = split.user?.id || split.user?._id || split.user;
              const splitName = split.user?.name || 'Friend';
              const amount = Number(split.owed ?? split.amount ?? 0);

              if (!balanceMap[splitUserId]) {
                balanceMap[splitUserId] = { id: splitUserId, name: splitName, amount: 0 };
              }
              balanceMap[splitUserId].amount += amount;
            });
        } else if (splitForUser) {
          const amount = Number(splitForUser.owed ?? splitForUser.amount ?? 0);
          const paidByName = expense.paidBy?.name || 'Friend';

          if (!balanceMap[paidById]) {
            balanceMap[paidById] = { id: paidById, name: paidByName, amount: 0 };
          }
          balanceMap[paidById].amount -= amount;
        }
      });

      settlementData.forEach((settlement) => {
        const payerId = settlement.payer?.id || settlement.payer?._id || settlement.payer;
        const payeeId = settlement.payee?.id || settlement.payee?._id || settlement.payee;
        const amount = Number(settlement.amount ?? 0);

        if (String(payerId) === String(userId)) {
          const payeeName = settlement.payee?.name || 'Friend';
          if (!balanceMap[payeeId]) {
            balanceMap[payeeId] = { id: payeeId, name: payeeName, amount: 0 };
          }
          balanceMap[payeeId].amount += amount;
        } else if (String(payeeId) === String(userId)) {
          const payerName = settlement.payer?.name || 'Friend';
          if (!balanceMap[payerId]) {
            balanceMap[payerId] = { id: payerId, name: payerName, amount: 0 };
          }
          balanceMap[payerId].amount -= amount;
        }
      });

      const totals = Object.values(balanceMap).reduce(
        (acc, item) => {
          if (item.amount >= 0) acc.owed += item.amount;
          else acc.owe += Math.abs(item.amount);
          return acc;
        },
        { owed: 0, owe: 0 }
      );

      setSummary({ total: totals.owed - totals.owe, owe: totals.owe, owed: totals.owed });

      const activeFriendBalances = Object.values(balanceMap)
        .filter((friend) => friend.amount !== 0)
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, 2);

      setFriendBalances(activeFriendBalances);
      setExpenses(expenseData.slice(0, 4));
      setStatus('success');
      setStatusMessage('Data loaded successfully.');
    } catch (err) {
      console.error('Dashboard load failed', err);
      const response = err?.response;
      if (response) {
        const serverMessage = response.data?.message || 'Something went wrong while fetching your data.';
        setStatus(response.status >= 500 ? 'database' : 'network');
        setStatusMessage(serverMessage);
      } else {
        setStatus('network');
        setStatusMessage('Unable to connect to the server. Please check your internet connection.');
      }
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  const dashboardGroups = groups.slice(0, 3);
  const recentExpenses = expenses;

  return (
    <div className="min-h-full bg-gradient-to-b from-emerald-50 via-white to-gray-100">
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-gray-900">Delete Expense?</h3>
            <p className="text-gray-500 mt-3 text-lg leading-relaxed">Are you sure you want to delete this expense? This action cannot be undone.</p>
            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                className="flex-1 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition shadow-lg shadow-red-100"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setExpenseToDelete(null);
                }}
                className="flex-1 h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="p-6 md:p-10">
        {/* Topbar */}
        <div className="flex flex-row items-start justify-between gap-4 md:gap-5 mb-8 md:mb-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight truncate">
              Welcome Back, <span className="text-emerald-500">{user?.name || 'User'} 👋</span>
            </h1>
            <p className="text-gray-500 mt-1 md:mt-2 text-sm md:text-lg">Track your expenses and settle with friends easily.</p>
          </div>

          <div className="hidden md:flex items-center gap-4 flex-wrap">
            <button
              onClick={() => navigate('/friends')}
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 hover:shadow-md transition font-medium flex items-center gap-2"
            >
              👥 Friends
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${friendReqCount > 0 ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {friendReqCount}
              </span>
            </button>

            <button
              onClick={() => navigate('/notifications')}
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 hover:shadow-md transition font-medium flex items-center gap-2"
            >
              🔔 Notifications
              {unreadNotifCount > 0 && (
                <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/expenses/new')}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg transition"
            >
              + Add Expense
            </button>

            <button
              onClick={handleLogout}
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 hover:shadow-md transition font-medium text-red-600"
            >
              Logout
            </button>
          </div>

          <div className="md:hidden relative" ref={menuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden z-50">
                <button
                  onClick={() => navigate('/friends')}
                  className="px-5 py-4 text-left font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50"
                >
                  <span className="flex items-center gap-2">👥 Friends</span>
                  {friendReqCount > 0 && (
                    <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{friendReqCount}</span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/notifications')}
                  className="px-5 py-4 text-left font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50"
                >
                  <span className="flex items-center gap-2">🔔 Notifications</span>
                  {unreadNotifCount > 0 && (
                    <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{unreadNotifCount}</span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/activity')}
                  className="px-5 py-4 text-left font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50"
                >
                  ⚡ Activity
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="px-5 py-4 text-left font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50"
                >
                  📊 Analytics
                </button>

                <button
                  onClick={handleLogout}
                  className="px-5 py-4 text-left font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {status !== 'success' ? (
          <div className="mb-10 flex justify-center">
            <LoadingAndErrorStatus
              status={status}
              message={statusMessage}
              onRetry={loadDashboard}
              groups={groups}
              expenses={expenses}
            />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
              <div className="bg-white rounded-2xl md:rounded-[30px] p-5 md:p-7 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm md:text-base text-gray-500">You Owe</p>
                    <h2 className="text-3xl md:text-4xl font-black mt-1 md:mt-3 text-red-500">₹{summary.owe.toFixed(0)}</h2>
                  </div>
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-red-100 flex items-center justify-center text-2xl md:text-3xl">📤</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl md:rounded-[30px] p-5 md:p-7 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm md:text-base text-gray-500">You Are Owed</p>
                    <h2 className="text-3xl md:text-4xl font-black mt-1 md:mt-3 text-emerald-500">₹{summary.owed.toFixed(0)}</h2>
                  </div>
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-emerald-100 flex items-center justify-center text-2xl md:text-3xl">📥</div>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
              {/* Recent Expenses */}
              <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-[32px] p-5 md:p-7 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-5 md:mb-8">
                  <div>
                    <h2 className="text-xl md:text-3xl font-black">Recent Expenses</h2>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Latest group and personal expenses</p>
                  </div>
                  <button onClick={() => navigate('/expenses')} className="text-emerald-500 font-semibold hover:underline text-sm md:text-base">
                    View All
                  </button>
                </div>

                <div className="space-y-3 md:space-y-5">
                  {recentExpenses.length ? (
                    recentExpenses.map((expense) => (
                      <div key={expense.id || expense._id} className="flex flex-row items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-3xl hover:bg-gray-50 transition border border-gray-100 gap-2">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl md:text-3xl shrink-0">
                            🧾
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm md:text-lg truncate">{expense.title}</h3>
                            <p className="text-xs md:text-sm text-gray-500 truncate">Paid by {expense.paidBy?.name || 'You'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                          <div className="text-right">
                            <h3 className="text-lg md:text-2xl font-black">₹{expense.amount}</h3>
                            <p className="text-[10px] md:text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                          </div>
                          {String(expense.createdBy?.id || expense.createdBy?._id || expense.createdBy) === String(userId) && (
                            <div className="flex items-center gap-1 md:gap-2">
                              <button
                                onClick={() => navigate(`/expenses/edit/${expense.id || expense._id}?redirect=dashboard`)}
                                className="p-2 md:p-2.5 rounded-lg md:rounded-xl border border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition text-gray-400"
                                title="Edit Expense"
                              >
                                <Edit className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense.id || expense._id)}
                                disabled={deletingExpenseId === (expense.id || expense._id)}
                                className="p-2 md:p-2.5 rounded-lg md:rounded-xl border border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition text-gray-400 disabled:opacity-60"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No recent expenses yet.</p>
                  )}
                </div>
              </div>

              {/* Right Side */}
              <div className="space-y-6 md:space-y-8">
                {/* Groups */}
                <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-7 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black">Your Groups</h2>
                      <p className="text-xs md:text-sm text-gray-500 mt-1">Active groups</p>
                    </div>
                    <button onClick={() => navigate('/groups')} className="text-emerald-500 font-semibold text-sm md:text-base">
                      + New
                    </button>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    {dashboardGroups.length ? (
                      dashboardGroups.map((group) => (
                        <button
                          key={group.id || group._id}
                          onClick={() => navigate(`/groups/${group.id || group._id}`)}
                          className="flex items-center justify-between w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-gray-50 hover:bg-emerald-50 transition"
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white flex items-center justify-center text-xl md:text-2xl shadow-sm">👥</div>
                            <div className="text-left">
                              <h3 className="font-semibold text-sm md:text-base">{group.name}</h3>
                              <p className="text-xs md:text-sm text-gray-500">{group.category || 'Group'}</p>
                            </div>
                          </div>
                          <p className="text-xs md:text-sm text-gray-700">{group.expenses?.length || 0} expenses</p>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No groups found. Create one to share expenses.</p>
                    )}
                  </div>
                </div>

                {/* Friends Balance */}
                <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-7 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black">Friend Balances</h2>
                      <p className="text-xs md:text-sm text-gray-500 mt-1">Quick payment summary</p>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-5">
                    {friendBalances.length > 0 ? (
                      friendBalances.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 md:p-0">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white flex items-center justify-center font-bold shadow-md text-sm md:text-base">
                              {item.name?.charAt(0) || 'F'}
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm md:text-base">{item.name}</h3>
                              <p className="text-xs md:text-sm text-gray-500">{item.amount >= 0 ? 'Owes you' : 'You owe'}</p>
                            </div>
                          </div>
                          <h3 className={`font-bold text-base md:text-lg ${item.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {item.amount >= 0 ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString()}
                          </h3>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No active friend balances yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}


      </main>
    </div>
  );
}
