import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, UserPlus, Wallet, Receipt, Search, Filter, MoreVertical, Trash2 } from 'lucide-react';
import api from '../services/api.js';

const typeStyles = {
  friend_request: { icon: <UserPlus size={22} />, color: 'bg-blue-100 text-blue-600' },
  settlement: { icon: <Wallet size={22} />, color: 'bg-emerald-100 text-emerald-600' },
  expense_added: { icon: <Receipt size={22} />, color: 'bg-orange-100 text-orange-600' },
  default: { icon: <Bell size={22} />, color: 'bg-slate-100 text-slate-600' },
};

const extractAmount = (message) => {
  const match = String(message).match(/₹([\d,]+)/);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pendingRequests, setPendingRequests] = useState(0);

  const loadNotifications = async () => {
    setLoading(true);
    setError('');

    try {
      const [notifRes, reqRes] = await Promise.all([
        api.get('notifications'),
        api.get('friends/requests')
      ]);
      setNotifications(notifRes.data.notifications || []);
      setPendingRequests(reqRes.data.requests?.length || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load notifications at this time.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Unable to mark all as read', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('notifications/clear-all');
      setNotifications([]);
    } catch (err) {
      console.error('Unable to clear notifications', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`notifications/${id}`);
      setNotifications(notifications.filter(n => n._id !== id));
    } catch (err) {
      console.error('Unable to delete notification', err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    const visible = notifications.filter(n => n.type !== 'expense_deleted');
    if (!searchText.trim()) return visible;
    const query = searchText.trim().toLowerCase();
    return visible.filter(
      (notification) =>
        notification.title?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query)
    );
  }, [notifications, searchText]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.read !== true && notification.type !== 'expense_deleted').length,
    [notifications]
  );

  const friendRequestCount = pendingRequests;

  const settlementAmount = useMemo(
    () =>
      notifications.reduce((sum, notification) => {
        if (notification.type === 'settlement') {
          return sum + extractAmount(notification.message);
        }
        return sum;
      }, 0),
    [notifications]
  );

  return (
    <div className="min-h-screen bg-[#f6f9f7]">
      <main className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <p className="text-emerald-600 font-bold uppercase tracking-[4px] text-xs md:text-sm">Notifications</p>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mt-2">Stay Updated 🔔</h1>
            <p className="text-gray-500 mt-2 md:mt-3 text-base md:text-lg">Track all activity, settlements and group updates.</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={handleMarkAllRead} className="h-14 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shadow-lg flex items-center gap-3">
              <CheckCircle2 size={20} />
              Mark All Read
            </button>
            <button onClick={handleClearAll} className="h-14 px-6 rounded-2xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition font-semibold flex items-center gap-3">
              <Trash2 size={20} />
              Clear All
            </button>
          </div>
        </div>



        <div className="bg-white rounded-[30px] p-5 shadow-lg border border-gray-100 flex flex-col md:flex-row gap-4 items-center mb-8">
          <div className="flex items-center gap-4 w-full">

            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search notifications..."
              className="flex-1 h-14 bg-transparent outline-none text-lg"
            />
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Search className="text-gray-500" />
            </div>
          </div>

        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="rounded-[32px] p-10 bg-white border border-gray-100 shadow-lg text-center text-gray-500">Loading notifications...</div>
          ) : error ? (
            <div className="rounded-[32px] p-10 bg-white border border-rose-100 shadow-lg text-center text-rose-700">{error}</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-[32px] p-10 bg-white border border-gray-100 shadow-lg text-center text-gray-500">No notifications yet.</div>
          ) : (
            filteredNotifications.map((item, index) => {
              const metadata = typeStyles[item.type] || typeStyles.default;
              return (
                <div
                  key={item._id || index}
                  className={`bg-white rounded-[32px] p-6 shadow-lg border transition hover:shadow-2xl ${item.read !== true ? 'border-emerald-200' : 'border-gray-100'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-start gap-4 md:gap-5">
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 ${metadata.color}`}>
                        {metadata.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{item.title}</h2>
                          {item.read !== true && <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500 shrink-0" />}
                        </div>
                        <p className="text-gray-500 mt-1 md:mt-2 text-base md:text-lg leading-snug md:leading-relaxed">{item.message}</p>
                        <p className="text-gray-400 mt-2 md:mt-4 font-medium uppercase tracking-[1px] md:tracking-[2px] text-xs md:text-sm">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="relative group/menu">
                      <button className="w-14 h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center">
                        <MoreVertical size={20} className="text-gray-500" />
                      </button>
                      <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-xl border border-gray-100 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition z-10 flex flex-col overflow-hidden">
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="px-5 py-4 text-left text-rose-600 font-semibold hover:bg-rose-50 transition flex items-center gap-3"
                        >
                          <Trash2 size={18} /> Delete Notification
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, emoji }) {
  return (
    <div className="bg-white rounded-2xl md:rounded-[28px] p-5 md:p-7 shadow-lg border border-gray-100 h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm md:text-base text-gray-500">{title}</p>
          <h2 className="text-2xl md:text-4xl font-black mt-1 md:mt-2 text-gray-900">{value}</h2>
        </div>
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-emerald-100 flex items-center justify-center text-2xl md:text-3xl shrink-0">{emoji}</div>
      </div>
    </div>
  );
}
