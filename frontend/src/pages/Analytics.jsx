import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Download,
} from 'lucide-react';
import api from '../services/api.js';

const defaultColors = ['bg-emerald-500', 'bg-orange-500', 'bg-blue-500', 'bg-purple-500'];

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await api.get('analytics');
        setAnalytics(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load analytics');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9f7] p-8">
        <div className="rounded-[32px] bg-white p-10 shadow-xl border border-gray-200 text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-lg font-semibold text-gray-900">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9f7] p-8">
        <div className="rounded-[32px] bg-rose-50 p-10 shadow-xl border border-rose-200 text-center">
          <p className="text-lg font-semibold text-rose-700">{error || 'Unable to load analytics data'}</p>
        </div>
      </div>
    );
  }

  const {
    totalSpent,
    monthlySpent,
    youAreOwed,
    youOwe,
    monthlyGrowth,
    categories,
    monthlyData,
    topGroups,
  } = analytics;

  const maxMonthlyValue = Math.max(...monthlyData.map((item) => item.value), 1);

  return (
    <div className="min-h-screen bg-[#f6f9f7]">
      <main className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <p className="text-emerald-600 font-bold uppercase tracking-[4px] text-sm">Analytics Dashboard</p>
            <h1 className="text-5xl font-black text-gray-900 mt-2">Expense Analytics 📊</h1>
            <p className="text-gray-500 mt-3 text-lg">Monitor spending, balances and group trends.</p>
          </div>

          <div className="flex gap-4">
            <button className="h-14 px-6 rounded-2xl border border-gray-200 hover:bg-gray-50 transition font-semibold flex items-center gap-3">
              <Calendar size={18} />
              This Month
            </button>
            <button className="h-14 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shadow-lg flex items-center gap-3">
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <SummaryCard title="Total Spent" value={`₹${totalSpent.toLocaleString()}`} icon={<Wallet size={28} />} />
          <SummaryCard title="You Are Owed" value={`₹${youAreOwed.toLocaleString()}`} positive icon={<ArrowDownLeft size={28} />} />
          <SummaryCard title="You Owe" value={`₹${youOwe.toLocaleString()}`} negative icon={<ArrowUpRight size={28} />} />
          <SummaryCard title="Monthly Growth" value={`${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth}%`} icon={<TrendingUp size={28} />} />
        </div>

        <div className="grid xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white rounded-[32px] p-7 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Monthly Spending</h2>
                <p className="text-gray-500 mt-2 text-lg">Your spending trend over the last 7 months.</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <BarChart3 size={24} />
              </div>
            </div>

            <div className="flex items-end justify-between gap-4 h-[320px] mt-8">
              {monthlyData.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center justify-end gap-3">
                  <div
                    style={{ height: `${Math.max(8, (item.value / maxMonthlyValue) * 100)}%` }}
                    className="w-full rounded-t-[20px] bg-gradient-to-t from-emerald-500 to-teal-400 shadow-lg hover:scale-105 transition"
                  />
                  <span className="text-gray-400 text-sm font-medium">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-7 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Categories</h2>
                <p className="text-gray-500 mt-2 text-lg">Spending distribution</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <PieChart size={24} />
              </div>
            </div>

            <div className="space-y-6">
              {(categories.length ? categories : [{ title: 'No data', amount: '₹0', percentage: '0%' }]).map((item, index) => (
                <div key={item.title}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`${defaultColors[index % defaultColors.length]} w-4 h-4 rounded-full`} />
                      <span className="font-semibold text-gray-700">{item.title}</span>
                    </div>
                    <span className="text-gray-500 font-medium">{item.percentage}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`${defaultColors[index % defaultColors.length]} h-full rounded-full`} style={{ width: item.percentage }} />
                  </div>
                  <div className="mt-2 text-right text-lg font-bold text-gray-900">{item.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          <div className="bg-white rounded-[32px] p-7 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Smart Insights</h2>
                <p className="text-gray-500 mt-2 text-lg">AI generated spending analysis.</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="space-y-5">
              <InsightCard title="Current month spending" desc={`You spent ₹${monthlySpent.toLocaleString()} this month.`} positive={monthlyGrowth >= 0} />
              <InsightCard title="Primary category" desc={`Your largest spending category is ${categories[0]?.title || 'N/A'}.`} />
              <InsightCard title="Top group" desc={`Your top group spent ${topGroups[0]?.amount || '₹0'} so far.`} positive />
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-7 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Top Groups</h2>
                <p className="text-gray-500 mt-2 text-lg">Most active groups this month.</p>
              </div>
            </div>
            <div className="space-y-5">
              {(topGroups.length ? topGroups : [{ name: 'No groups', amount: '₹0', members: '0 Members' }]).map((item) => (
                <GroupItem key={item.name} name={item.name} amount={item.amount} members={item.members} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

function SummaryCard({ title, value, icon, positive, negative }) {
  return (
    <div className="bg-white rounded-[28px] p-7 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base text-gray-500 truncate">{title}</p>
          <h2 className={`text-2xl md:text-4xl font-black mt-1 md:mt-2 truncate ${positive ? 'text-emerald-500' : negative ? 'text-red-500' : 'text-gray-900'}`}>
            {value}
          </h2>
        </div>
        <div className={`shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl ${positive ? 'bg-emerald-100 text-emerald-600' : negative ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, desc, positive }) {
  return (
    <div className="p-5 rounded-3xl border border-gray-100 hover:bg-gray-50 transition">
      <div className="flex items-center gap-3">
        {positive ? <TrendingUp className="text-emerald-500" size={22} /> : <TrendingDown className="text-orange-500" size={22} />}
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-500 mt-3 leading-relaxed">{desc}</p>
    </div>
  );
}

function GroupItem({ name, amount, members }) {
  return (
    <div className="flex items-center justify-between p-5 rounded-3xl border border-gray-100 hover:bg-gray-50 transition">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">👥</div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
          <p className="text-gray-500 mt-1">{members}</p>
        </div>
      </div>
      <h2 className="text-2xl font-black text-emerald-500">{amount}</h2>
    </div>
  );
}

export default Analytics;
