import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Search, Plus, ArrowUpRight, ArrowDownLeft, MessageCircle, UserPlus, X, Wallet, CreditCard, Smartphone, Building2, Calendar, CheckCircle2 } from 'lucide-react';
import api from '../services/api.js';
import LoadingAndErrorStates from './LoadingAndErrorStates.jsx';
import { useQueryClient } from '@tanstack/react-query';

const paymentMethods = [
  { title: 'UPI Payment', icon: <Smartphone size={22} /> },
  { title: 'Bank Transfer', icon: <Building2 size={22} /> },
  { title: 'Cash', icon: <Wallet size={22} /> },
  { title: 'Card Payment', icon: <CreditCard size={22} /> },
];

const Friends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchRef = useRef(null);
  const queryClient = useQueryClient();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({ owed: 0, owe: 0 });
  const [friendAmounts, setFriendAmounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlingFriend, setSettlingFriend] = useState(null);
  const [settlementMode, setSettlementMode] = useState('full');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('UPI Payment');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().slice(0, 10));
  const [settlementNote, setSettlementNote] = useState('');
  const [settlementRef, setSettlementRef] = useState('');
  const [settleError, setSettleError] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFriend, setDetailFriend] = useState(null);
  const [detailExpenses, setDetailExpenses] = useState([]);

  // Remove Friend Modal State
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  const loadFriends = async () => {
    try {
      const response = await api.get('friends');
      setFriends(response.data.friends || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      setPageLoading(true);
      await Promise.all([loadFriends(), loadRequests(), loadBalances()]);
      setPageLoading(false);
    };
    init();
  }, [user]);

  const loadRequests = async () => {
    try {
      const response = await api.get('friends/requests');
      setRequests(response.data.requests || []);
    } catch (err) {
      console.error('Unable to load friend requests', err);
    }
  };

  const loadBalances = async () => {
    if (!user) return;

    try {
      const [expenseResponse, settlementResponse] = await Promise.all([
        api.get('expenses'),
        api.get('settlements'),
      ]);

      const expenseData = expenseResponse.data.expenses || [];
      const settlementData = settlementResponse.data.settlements || [];
      setExpenses(expenseData);

      const userId = user._id || user.id;
      const amountsByFriend = {};

      if (expenseData.length === 0) {
        setBalances({ owed: 0, owe: 0 });
        setFriendAmounts({});
        return;
      }

      expenseData.forEach((expense) => {
        const paidById = expense.paidBy?.id || expense.paidBy?._id || expense.paidBy;
        const splitForUser = expense.splits?.find((split) => String(split.user?.id || split.user?._id || split.user) === String(userId));

        const paidByName = expense.paidBy?.name || 'Unknown';
        const paidByEmail = expense.paidBy?.email || '';
        const paidByAvatar = expense.paidBy?.avatar || '';

        if (String(paidById) === String(userId)) {
          expense.splits
            .filter((split) => String(split.user?.id || split.user?._id || split.user) !== String(userId))
            .forEach((split) => {
              const splitUserId = split.user?.id || split.user?._id || split.user;
              const amount = Number(split.owed ?? split.amount ?? 0);
              if (!amountsByFriend[splitUserId]) {
                 amountsByFriend[splitUserId] = { amount: 0, name: split.user?.name, email: split.user?.email, avatar: split.user?.avatar };
              }
              amountsByFriend[splitUserId].amount += amount;
            });
        } else if (splitForUser) {
          const amount = Number(splitForUser.owed ?? splitForUser.amount ?? 0);
          if (!amountsByFriend[paidById]) {
             amountsByFriend[paidById] = { amount: 0, name: paidByName, email: paidByEmail, avatar: paidByAvatar };
          }
          amountsByFriend[paidById].amount -= amount;
        }
      });

      settlementData.forEach((settlement) => {
        const payerId = settlement.payer?.id || settlement.payer?._id || settlement.payer;
        const payeeId = settlement.payee?.id || settlement.payee?._id || settlement.payee;
        const amount = Number(settlement.amount ?? 0);

        if (String(payerId) === String(userId)) {
          if (!amountsByFriend[payeeId]) {
             amountsByFriend[payeeId] = { amount: 0, name: settlement.payee?.name, email: settlement.payee?.email, avatar: settlement.payee?.avatar };
          }
          amountsByFriend[payeeId].amount += amount;
        } else if (String(payeeId) === String(userId)) {
          if (!amountsByFriend[payerId]) {
             amountsByFriend[payerId] = { amount: 0, name: settlement.payer?.name, email: settlement.payer?.email, avatar: settlement.payer?.avatar };
          }
          amountsByFriend[payerId].amount -= amount;
        }
      });

      const totals = Object.values(amountsByFriend).reduce(
        (acc, item) => {
          if (item.amount >= 0) acc.owed += item.amount;
          else acc.owe += Math.abs(item.amount);
          return acc;
        },
        { owed: 0, owe: 0 }
      );

      setBalances(totals);
      setFriendAmounts(amountsByFriend);
    } catch (err) {
      console.error('Unable to load friend balances', err);
      setBalances({ owed: 0, owe: 0 });
      setFriendAmounts({});
    }
  };

  const handleRemoveFriend = (friend) => {
    setFriendToRemove(friend);
    setRemoveModalOpen(true);
  };

  const confirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    setRemovingLoading(true);
    try {
      await api.delete(`friends/${friendToRemove.id || friendToRemove._id}`);
      setRemoveModalOpen(false);
      setFriendToRemove(null);
      loadFriends();
    } catch (err) {
      console.error('Unable to remove friend', err);
      alert(err.response?.data?.message || 'Unable to remove friend');
    } finally {
      setRemovingLoading(false);
    }
  };

  const openSettleModal = (friend) => {
    const balance = friendAmounts[friend.id || friend._id]?.amount ?? 0;
    setSettlingFriend({ ...friend, balance });
    setSettlementAmount(Number(Math.abs(balance).toFixed(2)).toString());
    setSettlementMode('full');
    setSelectedMethod('UPI Payment');
    setSettlementDate(new Date().toISOString().slice(0, 10));
    setSettlementNote('');
    setSettlementRef('');
    setSettleError('');
    setSettleOpen(true);
  };

  const closeSettleModal = () => {
    setSettleOpen(false);
  };

  const openFriendDetails = (friend) => {
    const friendExpenses = expenses
      .filter((expense) =>
        String(expense.paidBy?.id || expense.paidBy?._id || expense.paidBy) === String(friend.id || friend._id) ||
        expense.splits?.some((split) => String(split.user?.id || split.user?._id || split.user) === String(friend.id || friend._id))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    setDetailFriend(friend);
    setDetailExpenses(friendExpenses);
    setDetailOpen(true);
  };

  const closeDetailModal = () => {
    setDetailOpen(false);
  };

  const handleConfirmSettlement = async () => {
    if (!settlingFriend) return;
    if (!settlementAmount || Number(settlementAmount) <= 0) {
      setSettleError('Enter a valid amount to settle.');
      return;
    }

    setSettleLoading(true);
    setSettleError('');

    try {
      await api.post('settlements', {
        payee: settlingFriend.id || settlingFriend._id,
        amount: Number(settlementAmount),
        note: settlementNote,
        referenceId: settlementRef,
      });
      setSettleOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      loadBalances();
      loadFriends();
      loadRequests();
    } catch (err) {
      setSettleError(err.response?.data?.message || 'Unable to settle payment.');
    } finally {
      setSettleLoading(false);
    }
  };

  const handleSearch = async () => {
    setSearchError('');
    setSearchStatus('');
    setSearchResult(null);

    if (!searchQuery.trim()) {
      setSearchError('Enter a name, email or mobile to search.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/users/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResult(response.data);
      if (response.data.users && response.data.users.length > 0) {
        setSearchStatus(`${response.data.users.length} user(s) found.`);
      } else {
        setSearchStatus('No registered users found.');
      }
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (emailToRequest) => {
    setSearchError('');
    setSearchStatus('');
    try {
      await api.post('friends/request', { email: emailToRequest, message: '' });
      setSearchStatus('Friend request sent successfully.');
      const requestedUser = searchResult?.users?.find(u => u.email === emailToRequest);
      if (requestedUser) {
        setPendingSent((current) => [
          ...current.filter((item) => item.email !== emailToRequest),
          { ...requestedUser, status: 'pending' },
        ]);
      }
      loadFriends();
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Unable to send request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`friends/request/${requestId}/respond`, { status: 'accepted' });
      loadFriends();
      loadRequests();
    } catch (err) {
      console.error('Unable to accept request', err);
    }
  };

  const focusSearch = () => searchRef.current?.focus();

  const displayFriends = (() => {
    const friendMap = new Map();
    friends.forEach(f => {
      friendMap.set(String(f.id || f._id), { ...f, isFriend: true });
    });
    
    Object.entries(friendAmounts).forEach(([id, data]) => {
      if (Math.abs(data.amount) > 0 || friendMap.has(id)) {
        if (!friendMap.has(id)) {
          friendMap.set(id, { id, name: data.name, email: data.email, avatar: data.avatar, isFriend: false });
        }
      }
    });

    return Array.from(friendMap.values()).map((friend) => {
      const balance = friendAmounts[friend.id || friend._id]?.amount ?? 0;
      const positive = balance >= 0;
      const formatted = `₹${Number(Math.abs(balance).toFixed(2)).toLocaleString()}`;

      return {
        ...friend,
        amountValue: balance,
        amount: `${positive ? '+' : '-'}${formatted}`,
        status: balance === 0 ? 'No balance' : positive ? 'Owes you' : 'You owe',
        positive,
        avatar: friend.avatar || `https://ui-avatars.com/api/?name=${friend.name}&background=random`,
      };
    }).sort((a, b) => Math.abs(b.amountValue) - Math.abs(a.amountValue));
  })();

  if (pageLoading) {
    return <LoadingAndErrorStates status="loading" message="Loading friends..." />;
  }

  return (
    <div className="min-h-screen bg-[#f6f9f7] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900">Balances ⚖️</h1>
            <p className="text-gray-500 mt-2 text-lg">Manage balances and split expenses with friends.</p>
          </div>

          <button
            type="button"
            onClick={focusSearch}
            className="h-14 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shadow-lg flex items-center gap-3"
          >
            <UserPlus size={20} />
            Add Friend
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-2xl md:rounded-[28px] p-5 md:p-7 shadow-lg border border-gray-100 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm md:text-base text-gray-500">Total Accounts</p>
                <h2 className="text-2xl md:text-4xl font-black mt-1 md:mt-2">{friends.length}</h2>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-emerald-100 flex items-center justify-center text-2xl md:text-3xl shrink-0">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-[28px] p-5 md:p-7 shadow-lg border border-gray-100 h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm md:text-base text-gray-500">You Are Owed</p>
                <h2 className="text-2xl md:text-4xl font-black mt-1 md:mt-2 text-emerald-500">₹{balances.owed.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-emerald-100 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="text-emerald-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-[28px] p-5 md:p-7 shadow-lg border border-gray-100 h-full col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm md:text-base text-gray-500">You Owe</p>
                <h2 className="text-2xl md:text-4xl font-black mt-1 md:mt-2 text-red-500">₹{balances.owe.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-red-100 flex items-center justify-center shrink-0">
                <ArrowUpRight className="text-red-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 md:p-5 shadow-lg border border-gray-100 mb-8 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 bg-gray-50 md:bg-transparent rounded-2xl p-2 md:p-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white md:bg-gray-100 flex items-center justify-center shrink-0 shadow-sm md:shadow-none">
              <Search className="text-gray-500" size={20} />
            </div>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, email or mobile..."
              className="flex-1 h-12 md:h-14 bg-transparent outline-none text-base md:text-lg w-full"
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="h-14 w-full md:w-auto px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shrink-0"
          >
            Search
          </button>
        </div>

        {searchResult && (
          <div className="mb-8 rounded-[28px] border border-gray-100 bg-white p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-2xl">
                {searchResult.users && searchResult.users.length > 0 ? '👥' : '✉️'}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">
                  {searchResult.users && searchResult.users.length > 0 ? 'Search Results' : 'No registered user found'}
                </p>
                <p className="mt-1 text-sm text-slate-600">{searchStatus}</p>
              </div>
            </div>

            {searchResult.users && searchResult.users.length > 0 ? (
              <div className="mt-6 space-y-4">
                {searchResult.users.map(u => (
                  <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-4">
                       <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} className="w-12 h-12 rounded-xl object-cover" />
                       <div>
                         <h3 className="font-bold text-gray-900">{u.name}</h3>
                         <p className="text-sm text-gray-500">{u.email}</p>
                       </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendRequest(u.email)}
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600 shrink-0"
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 text-sm text-slate-600">
                Invite this email to join the app, then they can accept your friend request.
              </div>
            )}
          </div>
        )}

        {searchError && <p className="mb-6 text-sm text-rose-600">{searchError}</p>}

        {requests.length > 0 && (
          <div className="mb-8 rounded-[28px] border border-gray-100 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">Friend Requests</p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">Incoming requests</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                {requests.length} pending
              </span>
            </div>
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id || request._id} className="rounded-3xl border border-gray-200 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{request.sender.name}</p>
                    <h3 className="text-xl font-bold text-gray-900">{request.sender.email}</h3>
                    <p className="mt-2 text-sm text-slate-600">{request.message || 'Wants to connect with you.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAcceptRequest(request.id || request._id)}
                    className="h-14 rounded-2xl bg-emerald-500 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingSent.length > 0 && (
          <div className="mb-8 rounded-[28px] border border-gray-100 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-600">Pending Requests</p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">Requests you sent</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                {pendingSent.length} pending
              </span>
            </div>
            <div className="space-y-4">
              {pendingSent.map((pending) => (
                <div key={pending.email} className="rounded-3xl border border-gray-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{pending.name}</p>
                    <h3 className="text-xl font-bold text-gray-900">{pending.email}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {displayFriends.map((friend, index) => (
            <div
              key={friend.id || friend._id || index}
              className="bg-white rounded-2xl md:rounded-[30px] p-4 md:p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition"
            >
              <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3 md:gap-5 min-w-0">
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-3xl object-cover shrink-0"
                  />

                  <div className="min-w-0">
                    <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{friend.name}</h2>
                    <p className="mt-0.5 md:mt-2 text-xs md:text-lg font-medium md:font-semibold text-gray-500 truncate">{friend.email}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 min-w-0 max-w-[45%] md:max-w-[50%]">
                  <h2
                    className={`text-xl md:text-3xl font-black truncate ${friend.positive ? 'text-emerald-500' : 'text-red-500'}`}
                  >
                    {friend.amount}
                  </h2>
                  <p className="text-[10px] md:text-sm text-gray-400 mt-0.5 md:mt-1">{friend.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:gap-3 mt-4 md:mt-8">
                {!friend.positive ? (
                  <button
                    type="button"
                    onClick={() => openSettleModal(friend)}
                    className="h-10 md:h-14 rounded-xl md:rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shadow-md flex items-center justify-center text-xs md:text-sm"
                  >
                    Settle Up
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="h-10 md:h-14 rounded-xl md:rounded-2xl border border-gray-200 bg-slate-100 text-slate-500 font-semibold shadow-sm flex items-center justify-center text-xs md:text-sm px-1"
                  >
                    Request
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openFriendDetails(friend)}
                  className="h-10 md:h-14 rounded-xl md:rounded-2xl border border-gray-200 hover:bg-gray-50 transition font-semibold text-gray-700 flex items-center justify-center gap-1 text-xs md:text-sm"
                >
                  <MessageCircle size={16} className="w-4 h-4 md:w-5 md:h-5" />
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {settleOpen && settlingFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-6xl max-h-[95vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-[45%] bg-gradient-to-br from-emerald-500 to-teal-500 p-10 text-white relative overflow-hidden shrink-0 hidden lg:block">
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl"></div>

              <div className="flex items-center gap-5 relative z-10">
                <img
                  src={settlingFriend.avatar}
                  alt={settlingFriend.name}
                  className="w-28 h-28 rounded-[30px] object-cover border-4 border-white/30 shadow-xl"
                />
                <div>
                  <h1 className="text-4xl font-black">{settlingFriend.name}</h1>
                  <p className="text-white/80 text-lg mt-2">{settlingFriend.email}</p>
                </div>
              </div>

              <div className="mt-14 relative z-10">
                <p className="uppercase tracking-[4px] text-white/70 font-semibold text-sm">Pending Settlement</p>
                <h2 className="text-6xl font-black mt-4">₹{Math.abs(settlingFriend.balance || 0).toLocaleString()}</h2>
                <p className="text-white/80 text-xl mt-4">
                  {settlingFriend.balance < 0
                    ? `You owe ${settlingFriend.name} for recent expenses.`
                    : `${settlingFriend.name} owes you for recent expenses.`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-14 relative z-10">
                <div className="bg-white/10 backdrop-blur-lg rounded-[28px] p-6 border border-white/10">
                  <p className="text-white/70 text-sm uppercase tracking-[2px]">Total Expenses</p>
                  <h3 className="text-3xl font-black mt-3">₹{Math.max(Math.abs(settlingFriend.balance || 0) * 2, 0).toLocaleString()}</h3>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-[28px] p-6 border border-white/10">
                  <p className="text-white/70 text-sm uppercase tracking-[2px]">Your Share</p>
                  <h3 className="text-3xl font-black mt-3">₹{Math.abs(settlingFriend.balance || 0).toLocaleString()}</h3>
                </div>
              </div>
            </div>

            <div className="flex-1 p-5 md:p-6 relative no-scrollbar overflow-y-auto">
              <button
                type="button"
                onClick={closeSettleModal}
                className="absolute top-4 right-4 w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center"
              >
                <X size={20} className="text-gray-500" />
              </button>

              <div>
                <p className="text-emerald-600 font-bold uppercase tracking-[4px] text-xs">Settle Payment</p>
                <h1 className="text-3xl font-black text-gray-900 mt-2 leading-tight">Settle Up 💸</h1>
                <p className="text-gray-500 mt-2 text-base leading-relaxed">
                  Choose settlement amount, payment method and confirm transaction.
                </p>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-[2px]">Settlement Type</label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSettlementMode('full');
                      setSettlementAmount(Number(Math.abs(settlingFriend.balance || 0).toFixed(2)).toString());
                    }}
                    className={`h-12 rounded-xl font-bold text-base ${settlementMode === 'full' ? 'bg-emerald-500 text-white shadow-md' : 'border border-gray-200 hover:bg-gray-50 text-gray-900'}`}
                  >
                    Full Settle
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementMode('custom')}
                    className={`h-12 rounded-xl border border-gray-200 hover:bg-gray-50 transition font-semibold text-base ${settlementMode === 'custom' ? 'bg-emerald-50 text-emerald-700 shadow-md' : 'text-gray-900'}`}
                  >
                    Custom Amount
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-[2px]">Amount</label>
                <div className="mt-2 relative">
                  <input
                    type="number"
                    min="0"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    className="w-full h-14 rounded-xl border border-gray-200 px-6 text-2xl font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">INR</span>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-[2px]">Payment Method</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.title}
                      type="button"
                      onClick={() => setSelectedMethod(method.title)}
                      className={`p-3 rounded-xl border transition text-left flex items-center gap-3 ${selectedMethod === method.title ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-white shadow-sm flex items-center justify-center text-emerald-600">
                        {method.icon}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">{method.title}</h3>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-[2px]">Settlement Date</label>
                <div className="mt-2 relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    className="w-full h-12 rounded-xl border border-gray-200 pl-11 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-[2px]">Notes</label>
                <textarea
                  value={settlementNote}
                  onChange={(e) => setSettlementNote(e.target.value)}
                  placeholder="Add payment notes or reference..."
                  className="mt-2 w-full h-20 rounded-xl border border-gray-200 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-100 text-sm"
                />
              </div>

              {settleError && <p className="mt-3 text-sm text-rose-600">{settleError}</p>}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleConfirmSettlement}
                  disabled={settleLoading}
                  className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition text-white text-base font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} />
                  {settleLoading ? 'Processing...' : 'Confirm'}
                </button>

                <button
                  type="button"
                  onClick={closeSettleModal}
                  className="h-12 px-6 rounded-xl border border-gray-200 hover:bg-gray-50 transition font-bold text-base text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailOpen && detailFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-5xl bg-white rounded-3xl md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 md:p-6 shrink-0">
              <div>
                <p className="text-[10px] md:text-sm uppercase tracking-[3px] text-emerald-600 font-bold">Friend Details</p>
                <h2 className="mt-1 md:mt-3 text-2xl md:text-4xl font-black text-gray-900">{detailFriend.name}</h2>
                <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-500">{detailFriend.email}</p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center shrink-0"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto">
              <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">Expenses involving {detailFriend.name}. Showing recent activity between you and this friend.</p>
              {detailExpenses.length === 0 ? (
                <div className="rounded-2xl md:rounded-[28px] border border-gray-200 bg-slate-50 p-6 md:p-10 text-center text-sm md:text-base text-gray-500">
                  No expenses found for this friend.
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {detailExpenses.map((expense) => (
                    <div key={expense.id || expense._id} className="rounded-xl md:rounded-[28px] border border-gray-200 p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                        <div>
                          <p className="text-[10px] md:text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                          <h3 className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 md:mt-0">{expense.title}</h3>
                          <p className="mt-1 md:mt-2 text-xs md:text-sm text-slate-600">
                            {expense.group?.name ? `${expense.group.name} · ` : ''}
                            Paid by {expense.paidBy?.name || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-left md:text-right mt-2 md:mt-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                          <p className={`text-xl md:text-3xl font-black ${String(expense.paidBy?.id || expense.paidBy?._id || expense.paidBy) === String(detailFriend.id || detailFriend._id) ? 'text-emerald-500' : 'text-red-500'}`}>
                            ₹{Number(expense.amount).toLocaleString()}
                          </p>
                          <p className="text-[10px] md:text-sm text-gray-500 mt-0.5 md:mt-1">{expense.splitType || 'Shared expense'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {removeModalOpen && friendToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 relative">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🗑️</span>
            </div>

            <h2 className="text-3xl font-black text-center text-gray-900 leading-tight">Remove Friend</h2>

            <p className="text-center text-gray-500 mt-4 text-lg leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-gray-900">{friendToRemove.name}</span> from your friends list?
              This will remove you from their friends list as well.
            </p>

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={confirmRemoveFriend}
                disabled={removingLoading}
                className="flex-1 h-14 rounded-2xl bg-red-500 hover:bg-red-600 transition text-white font-bold shadow-lg disabled:opacity-60"
              >
                {removingLoading ? 'Removing...' : 'Yes, Remove'}
              </button>
              <button
                type="button"
                onClick={() => setRemoveModalOpen(false)}
                className="flex-1 h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 transition font-bold text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Friends;
