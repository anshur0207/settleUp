import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { ChevronLeft, Calendar, Upload, Receipt, Users, CheckCircle2 } from 'lucide-react';

const categories = ['🍔 Food', '⛽ Fuel', '🏨 Hotel', '✈ Travel', '🎉 Fun', '📦 Other'];

const splitTypes = [
  { id: 'equal', label: 'Equally' },
  { id: 'exact', label: 'Exact Amount' },
  { id: 'percentage', label: 'Percentage' },
  { id: 'shares', label: 'Shares' },
  { id: 'adjustment', label: 'Adjustment' },
  { id: 'unequal', label: 'Unequally' },
];

export default function AddExpense() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { expenseId } = useParams();
  const [searchParams] = useSearchParams();
  const groupQuery = searchParams.get('groupId') || '';
  const isEditMode = Boolean(expenseId);
  const userId = user?.id || user?._id;
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [groupId, setGroupId] = useState(groupQuery);
  const [notes, setNotes] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedPayer, setSelectedPayer] = useState(userId);
  const [splitType, setSplitType] = useState('equal');
  const [memberSplits, setMemberSplits] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await api.get('groups');
        setGroups(response.data.groups || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadGroups();
  }, []);

  useEffect(() => {
    if (!expenseId) return;
    const loadExpense = async () => {
      setLoadingExpense(true);
      try {
        const response = await api.get(`expenses/${expenseId}`);
        const expense = response.data.expense;
        setTitle(expense.title || '');
        setAmount(expense.amount?.toString() || '');
        setCurrency(expense.currency || user?.currency || 'INR');
        setGroupId(expense.group?._id || '');
        setNotes(expense.notes || '');
        setSelectedCategory(expense.category || categories[0]);
        setSelectedPayer(expense.paidBy?._id || expense.paidBy || userId);
        setDate(expense.date ? new Date(expense.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
        setSplitType(expense.splitType || 'equal');
        setMemberSplits(
          (expense.splits || []).map((split) => ({
            user: split.user?._id || split.user,
            name: split.user?.name || '',
            paid: split.paid || 0,
            share: split.share || (expense.splitType === 'exact' || expense.splitType === 'unequal' ? split.owed : 0),
            percent: split.percent || 0,
            adjustment: split.adjustment || 0,
          }))
        );
      } catch (err) {
        console.error('Unable to load expense', err);
      } finally {
        setLoadingExpense(false);
      }
    };
    loadExpense();
  }, [expenseId, user?.currency, userId]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === groupId) || null,
    [groupId, groups]
  );

  useEffect(() => {
    if (isEditMode && memberSplits.length > 0) {
      return;
    }

    const members = selectedGroup?.members?.length
      ? selectedGroup.members
      : [{ _id: userId, name: user?.name || 'You' }];

    const initialSplits = members.map((member) => ({
      user: member._id,
      name: member.name,
      paid: 0,
      share: 0,
      percent: 0,
      adjustment: 0,
    }));

    setMemberSplits(initialSplits);
    setSelectedPayer(members.some((member) => String(member._id) === String(userId)) ? userId : members[0]._id);
  }, [selectedGroup, userId, user?.name, isEditMode, memberSplits.length]);

  const handleMemberFieldChange = (index, field, value) => {
    const updated = [...memberSplits];
    updated[index][field] = value;
    setMemberSplits(updated);
  };

  const exactTotal = memberSplits.reduce((sum, item) => sum + (Number(item.share) || 0), 0);
  const percentTotal = memberSplits.reduce((sum, item) => sum + (Number(item.percent) || 0), 0);
  const adjustmentTotal = memberSplits.reduce((sum, item) => sum + (Number(item.adjustment) || 0), 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (!title || !amount) {
      setError('Title and amount are required.');
      setLoading(false);
      return;
    }

    if (splitType === 'exact' || splitType === 'unequal') {
      if (exactTotal !== Number(amount)) {
        setError(`Exact amounts must sum to ${amount}`);
        setLoading(false);
        return;
      }
    } else if (splitType === 'percentage') {
      if (percentTotal !== 100) {
        setError(`Percentages must sum to 100`);
        setLoading(false);
        return;
      }
    } else if (splitType === 'adjustment') {
      if (adjustmentTotal !== 0) {
        setError(`Adjustments must sum to 0`);
        setLoading(false);
        return;
      }
    }

    try {
      const participants = memberSplits.map((member) => ({
        user: member.user,
        paid: member.user === selectedPayer ? Number(amount) : 0,
        share: Number(member.share) || 0,
        percent: Number(member.percent) || 0,
        adjustment: Number(member.adjustment) || 0,
      }));

      const payload = {
        title,
        amount: Number(amount),
        currency,
        paidBy: selectedPayer,
        groupId: groupId || undefined,
        splitType,
        participants: selectedGroup ? participants : undefined,
        notes,
        category: selectedCategory,
        date,
      };

      if (isEditMode) {
        await api.put(`expenses/${expenseId}`, payload);
      } else {
        await api.post('expenses', payload);
      }

      if (searchParams.get('redirect') === 'dashboard') {
        navigate('/dashboard');
      } else if (isEditMode && groupId) {
        navigate(`/groups/${groupId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save expense');
    } finally {
      setLoading(false);
    }
  };

  const groupMembersCount = selectedGroup?.members?.length || 1;
  const yourShare = amount ? Number(amount) / groupMembersCount : 0;

  return (
    <div className="min-h-screen bg-[#f6f9f7] p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
        <div>
          <div className="flex items-center gap-2 text-gray-400 mb-3">
            <button type="button" onClick={() => navigate('/dashboard')} className="flex items-center gap-2 hover:text-emerald-500 transition">
              <ChevronLeft size={18} />
              Back to Dashboard
            </button>
          </div>
          <p className="text-emerald-600 font-bold uppercase tracking-[4px] text-xs md:text-sm">Add Expense</p>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mt-1 md:mt-2">Create New Expense 💸</h1>
          <p className="text-gray-500 mt-2 md:mt-3 text-sm md:text-lg">Split expenses with your group members seamlessly.</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-2 bg-white rounded-2xl md:rounded-[32px] p-5 md:p-8 shadow-lg border border-gray-100 overflow-hidden min-w-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <InputField label="Expense Title" value={title} onChange={setTitle} placeholder="Dinner with friends" />
            <InputField label="Amount" value={amount} onChange={setAmount} placeholder="₹ 0.00" type="number" />
            <InputField label="Date" value={date} onChange={setDate} type="date" />
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">Group</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="mt-2 md:mt-3 w-full h-14 md:h-16 rounded-xl md:rounded-2xl border border-gray-200 px-4 md:px-5 text-base md:text-lg bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 shadow-sm transition"
              >
                <option value="">Personal Expense</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {groups.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  No groups available yet. Create or join a group to split expenses.
                </p>
              )}
            </div>
          </div>

          <div className="mt-10">
            <label className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">Category</label>
            <div className="flex flex-wrap gap-2 md:gap-4 mt-3 md:mt-4">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-10 md:h-12 px-4 md:px-5 text-sm md:text-base rounded-xl md:rounded-2xl font-bold transition ${selectedCategory === category
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-sm'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <label className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">Paid By</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3 md:mt-4">
              {(selectedGroup?.members || [{ _id: userId, name: user?.name || 'You' }]).map((member) => (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => setSelectedPayer(member._id)}
                  className={`h-12 md:h-14 rounded-xl md:rounded-2xl font-bold transition flex items-center justify-center gap-2 text-sm md:text-base ${member._id === selectedPayer
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-sm'
                    }`}
                >
                  {member._id === selectedPayer && <CheckCircle2 size={18} />}
                  {member.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 md:mt-12 bg-slate-50 border border-slate-100 p-4 md:p-6 rounded-2xl md:rounded-[32px] overflow-hidden min-w-0">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <label className="text-sm font-semibold text-gray-500 uppercase tracking-[2px]">Split Options</label>
            </div>

            <div className="flex overflow-x-auto gap-2 md:gap-3 mb-6 md:mb-8 pb-2 no-scrollbar">
              {splitTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSplitType(type.id)}
                  className={`px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base rounded-xl md:rounded-2xl font-bold transition whitespace-nowrap border ${splitType === type.id
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 shadow-sm'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {splitType === 'exact' && exactTotal !== Number(amount) && (
              <div className="mb-6 p-5 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100 flex items-center gap-3">
                <span className="text-lg">⚠️</span> Sum of exact amounts (₹{exactTotal}) must equal the total amount (₹{amount || 0}).
              </div>
            )}
            {splitType === 'percentage' && percentTotal !== 100 && (
              <div className="mb-6 p-5 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100 flex items-center gap-3">
                <span className="text-lg">⚠️</span> Sum of percentages ({percentTotal}%) must equal 100%.
              </div>
            )}
            {splitType === 'adjustment' && adjustmentTotal !== 0 && (
              <div className="mb-6 p-5 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100 flex items-center gap-3">
                <span className="text-lg">⚠️</span> Sum of adjustments (₹{adjustmentTotal}) must equal 0.
              </div>
            )}
            {splitType === 'unequal' && exactTotal !== Number(amount) && (
              <div className="mb-6 p-5 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100 flex items-center gap-3">
                <span className="text-lg">⚠️</span> Allocated (₹{exactTotal}) must equal the total amount (₹{amount || 0}).
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {memberSplits.map((member, index) => (
                <div
                  key={member.user}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition gap-3 md:gap-0"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-base md:text-lg font-black">
                      {member.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm md:text-base">{member.name}</h3>
                      <p className="text-gray-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Member</p>
                    </div>
                  </div>

                  {splitType === 'equal' && (
                    <div className="text-emerald-500 font-black text-xl">
                      ₹ {amount ? (Number(amount) / memberSplits.length).toFixed(2) : 0}
                    </div>
                  )}

                  {(splitType === 'exact' || splitType === 'unequal') && (
                    <div className="flex flex-col gap-2 md:gap-3 w-full md:w-1/3 md:min-w-[120px]">
                      <input
                        type="number"
                        value={member.share === 0 ? '' : member.share}
                        onChange={(e) => handleMemberFieldChange(index, 'share', e.target.value)}
                        placeholder="₹ 0"
                        className="w-full h-10 md:h-12 rounded-xl md:rounded-2xl border border-gray-200 text-center font-bold outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 transition text-sm md:text-base"
                      />
                      {splitType === 'unequal' && (
                        <input
                          type="range"
                          min="0"
                          max={amount || 100}
                          value={member.share || 0}
                          onChange={(e) => handleMemberFieldChange(index, 'share', e.target.value)}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      )}
                    </div>
                  )}

                  {splitType === 'percentage' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={member.percent === 0 ? '' : member.percent}
                        onChange={(e) => handleMemberFieldChange(index, 'percent', e.target.value)}
                        placeholder="0"
                        className="w-20 h-12 rounded-2xl border border-gray-200 text-center font-bold outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 transition"
                      />
                      <span className="font-black text-gray-400 text-xl">%</span>
                    </div>
                  )}

                  {splitType === 'shares' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={member.share === 0 ? '' : member.share}
                        onChange={(e) => handleMemberFieldChange(index, 'share', e.target.value)}
                        placeholder="1"
                        className="w-20 h-12 rounded-2xl border border-gray-200 text-center font-bold outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 transition"
                      />
                      <span className="font-bold text-gray-400 text-sm">shares</span>
                    </div>
                  )}

                  {splitType === 'adjustment' && (
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-400 text-xl">₹</span>
                      <input
                        type="number"
                        value={member.adjustment === 0 ? '' : member.adjustment}
                        onChange={(e) => handleMemberFieldChange(index, 'adjustment', e.target.value)}
                        placeholder="+/- 0"
                        className="w-24 h-12 rounded-2xl border border-gray-200 text-center font-bold outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 transition"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 md:mt-10">
            <label className="text-[10px] md:text-sm font-semibold text-gray-500 uppercase tracking-[2px]">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes or description..."
              className="mt-2 md:mt-4 w-full h-20 md:h-28 rounded-xl md:rounded-3xl border border-gray-200 p-4 md:p-6 font-medium text-sm md:text-lg focus:outline-none focus:ring-4 focus:ring-emerald-100 resize-none shadow-sm transition"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mt-8 md:mt-12">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || loadingExpense}
              className="h-14 md:h-16 w-full md:w-auto px-6 md:px-10 rounded-xl md:rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white text-base md:text-lg font-black shadow-xl shadow-emerald-200 disabled:opacity-60 shrink-0"
            >
              {isEditMode ? 'Update Expense' : 'Submit Expense'}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}`)}
                className="h-14 md:h-16 w-full md:w-auto px-6 md:px-10 rounded-xl md:rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition font-bold text-gray-600 text-base md:text-lg shadow-sm shrink-0"
              >
                Back to Group
              </button>
            )}
            {!isEditMode && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="h-14 md:h-16 w-full md:w-auto px-6 md:px-10 rounded-xl md:rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition font-bold text-gray-600 text-base md:text-lg shadow-sm shrink-0"
              >
                Save as Draft
              </button>
            )}
          </div>
        </div>

        <div className="hidden xl:block space-y-8">
          <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-8 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                <Receipt className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900">Expense Preview</h2>
                <p className="text-gray-500 mt-0.5 md:mt-1 font-medium text-xs md:text-sm">Summary before submission</p>
              </div>
            </div>
            <div className="space-y-4">
              <PreviewItem title="Expense" value={title || 'Dinner with friends'} />
              <PreviewItem title="Category" value={selectedCategory} />
              <PreviewItem title="Amount" value={amount ? `₹ ${Number(amount).toLocaleString()}` : '₹ 0'} />
              <PreviewItem title="Paid By" value={(selectedGroup?.members || [{ name: user?.name || 'You' }]).find((member) => String(member._id) === String(selectedPayer))?.name || user?.name || 'You'} />
              <PreviewItem title="Split Type" value={splitTypes.find(t => t.id === splitType)?.label || 'Equally'} />
            </div>
          </div>



          <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-8 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                <Users className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900">Group Details</h2>
              </div>
            </div>
            <div className="space-y-4">
              <PreviewItem title="Group" value={selectedGroup?.name || 'Personal Expense'} />
              <PreviewItem title="Members" value={`${groupMembersCount} Member${groupMembersCount === 1 ? '' : 's'}`} />
              <PreviewItem title="Currency" value={currency} />
            </div>
          </div>
        </div>
      </div>
      {error && <p className="mt-8 p-5 bg-rose-50 border border-rose-100 text-center text-rose-600 font-bold rounded-2xl shadow-sm">{error}</p>}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-[10px] md:text-sm font-semibold text-gray-500 uppercase tracking-[2px]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 md:mt-3 w-full h-14 md:h-16 rounded-xl md:rounded-2xl border border-gray-200 bg-white px-4 md:px-5 text-base md:text-lg font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-100 shadow-sm transition"
      />
    </div>
  );
}

function PreviewItem({ title, value }) {
  return (
    <div className="p-4 md:p-5 rounded-2xl md:rounded-[24px] bg-slate-50 border border-slate-100 flex items-center justify-between">
      <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px] md:text-xs">{title}</p>
      <h3 className="font-black text-gray-900 text-right text-sm md:text-base">{value}</h3>
    </div>
  );
}
