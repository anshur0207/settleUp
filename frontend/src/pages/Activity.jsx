import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Bell,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  MessageCircle,
} from 'lucide-react';

import api from '../services/api.js';

export default function Activity() {
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const [notifications, setNotifications] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  const loadActivity = async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const [notificationsRes, expensesRes] = await Promise.all([
        api.get('notifications'),
        api.get('expenses', { params: { search } }),
      ]);

      setNotifications(notificationsRes.data.notifications || []);
      setExpenses(expensesRes.data.expenses || []);
    } catch (err) {
      console.error('Unable to load activity', err);
      setError(err.response?.data?.message || 'Unable to fetch activity feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadActivity(searchText);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchText]);

  const activityItems = useMemo(() => {
    const notificationItems = notifications.map((notification) => ({
      id: notification._id,
      user: 'Update',
      action: notification.title,
      group: notification.meta?.group ? 'Group update' : notification.message,
      amount: '',
      time: new Date(notification.createdAt).toLocaleString(),
      date: notification.createdAt,
      icon: <Bell size={20} />,
      color: 'bg-slate-100 text-slate-700',
    }));

    const expenseItems = expenses.map((expense) => ({
      id: expense._id,
      user: expense.paidBy?.name || 'Someone',
      action: `added ${expense.title}`,
      group: expense.group?.name || 'Personal',
      amount: `₹${expense.amount.toLocaleString()}`,
      time: new Date(expense.date).toLocaleDateString(),
      date: expense.date,
      icon: <Receipt size={20} />,
      color: 'bg-emerald-100 text-emerald-600',
    }));

    return [...expenseItems, ...notificationItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [notifications, expenses]);

  const filteredActivityItems = useMemo(() => {
    if (!searchText.trim()) return activityItems;
    const query = searchText.trim().toLowerCase();

    return activityItems.filter((item) => {
      return [item.user, item.action, item.group, item.amount, item.time].some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [activityItems, searchText]);

  const activitySummary = useMemo(() => {
    const totalActivities = activityItems.length;
    let moneyReceived = 0;
    let moneyPaid = 0;

    expenses.forEach((expense) => {
      const paidById = expense.paidBy?._id || expense.paidBy;
      const isCreator = String(paidById) === String(userId);
      if (isCreator) {
        moneyReceived +=
          expense.splits?.reduce((sum, split) => {
            const splitUserId = split.user?._id || split.user;
            if (String(splitUserId) !== String(userId)) {
              return sum + (split.owed ?? split.amount ?? 0);
            }
            return sum;
          }, 0) || 0;
      } else {
        const mySplit = expense.splits?.find((split) => String(split.user?._id || split.user) === String(userId));
        if (mySplit) {
          moneyPaid += mySplit.owed ?? mySplit.amount ?? 0;
        }
      }
    });

    return { totalActivities, moneyReceived, moneyPaid };
  }, [expenses, activityItems.length, userId]);

  return (
    <div className="min-h-screen bg-[#f6f9f7] pb-28 pt-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900">Activity Feed 🔔</h1>
            <p className="text-gray-500 mt-2 text-lg">Track all expenses, settlements and group updates.</p>
          </div>

          <button className="h-14 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shadow-lg flex items-center gap-3">
            <Bell size={20} />
            Notifications
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <SummaryCard title="Total Activities" value={activitySummary.totalActivities.toString()} emoji="📈" />

          <SummaryCard
            title="Money Received"
            value={`₹${activitySummary.moneyReceived.toLocaleString()}`}
            positive
            icon={<ArrowUpRight size={28} />}
          />

          <SummaryCard
            title="Money Paid"
            value={`₹${activitySummary.moneyPaid.toLocaleString()}`}
            negative
            icon={<ArrowDownLeft size={28} />}
          />
        </div>

        <div className="bg-white rounded-[28px] p-5 shadow-lg border border-gray-100 flex flex-col md:flex-row items-center gap-4 mb-8">
          <div className="flex items-center gap-4 w-full">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Search className="text-gray-500" />
            </div>

            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search activities..."
              className="flex-1 h-14 bg-transparent outline-none text-lg"
            />
          </div>

          <button className="h-14 px-6 rounded-2xl border border-gray-200 hover:bg-gray-50 transition font-semibold flex items-center gap-3 w-full md:w-auto justify-center">
            <Filter size={18} />
            Filters
          </button>
        </div>

        {loading ? (
          <div className="rounded-[32px] p-10 bg-white border border-gray-100 shadow-lg text-center text-gray-500">Loading activity feed...</div>
        ) : error ? (
          <div className="rounded-[32px] p-10 bg-white border border-rose-100 shadow-lg text-center text-rose-600">{error}</div>
        ) : (
          <div className="space-y-6">
            {filteredActivityItems.length ? (
              filteredActivityItems.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-[32px] p-6 shadow-lg border border-gray-100 hover:shadow-2xl transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${activity.color}`}>
                        {activity.icon}
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-relaxed">
                          <span className="text-emerald-600">{activity.user}</span> {activity.action}
                        </h2>

                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          {activity.group && (
                            <div className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold">
                              {activity.group}
                            </div>
                          )}

                          <p className="text-gray-400 text-sm">{activity.time}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {activity.amount && (
                        <h2 className="text-3xl font-black text-emerald-500">{activity.amount}</h2>
                      )}

                      <button className="w-14 h-14 rounded-2xl border border-gray-200 hover:bg-gray-50 transition flex items-center justify-center">
                        <MessageCircle size={20} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[32px] p-10 bg-white border border-gray-100 shadow-lg text-center text-gray-500">
                No activity available yet. Add an expense or invite members to start tracking shared activity.
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  );
}

function SummaryCard({ title, value, emoji, icon, positive, negative }) {
  return (
    <div className="bg-white rounded-[28px] p-7 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500">{title}</p>

          <h2
            className={`text-4xl font-black mt-2 ${
              positive ? 'text-emerald-500' : negative ? 'text-red-500' : 'text-gray-900'
            }`}
          >
            {value}
          </h2>
        </div>

        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl ${
            positive ? 'bg-emerald-100 text-emerald-600' : negative ? 'bg-red-100 text-red-500' : 'bg-emerald-100'
          }`}
        >
          {emoji || icon}
        </div>
      </div>
    </div>
  );
}
