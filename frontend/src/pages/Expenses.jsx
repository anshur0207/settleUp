import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Search, Receipt } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';


export default function Expenses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?._id || user?.id;
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const loadExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('expenses');
      setExpenses(res.data.expenses || []);
    } catch (err) {
      console.error('Unable to fetch expenses', err);
      setError('Unable to load expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

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
      setExpenses(expenses.filter(e => e._id !== expenseToDelete));
    } catch (err) {
      console.error('Unable to delete expense', err);
      alert(err.response?.data?.message || 'Unable to delete expense.');
    } finally {
      setDeletingExpenseId(null);
      setExpenseToDelete(null);
    }
  };

  const filteredExpenses = expenses.filter(expense => 
    expense.title?.toLowerCase().includes(searchText.toLowerCase()) || 
    expense.group?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f6f9f7] pb-28 pt-6">
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

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <p className="text-emerald-600 font-bold uppercase tracking-[4px] text-sm">Expenses</p>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mt-2">All Transactions 🧾</h1>
            <p className="text-gray-500 mt-2 text-lg">Manage and review all your shared costs.</p>
          </div>

          <button
            onClick={() => navigate('/expenses/new')}
            className="h-14 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white font-semibold shadow-lg flex items-center gap-3"
          >
            + Add Expense
          </button>
        </div>

        <div className="bg-white rounded-[28px] p-5 shadow-lg border border-gray-100 flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Search className="text-gray-500" />
          </div>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search expenses..."
            className="flex-1 h-14 bg-transparent outline-none text-lg"
          />
        </div>

        <div className="bg-white rounded-[32px] p-7 shadow-lg border border-gray-100">
          <div className="space-y-5">
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading your expenses...</div>
            ) : error ? (
              <div className="py-10 text-center text-rose-500">{error}</div>
            ) : filteredExpenses.length ? (
              filteredExpenses.map((expense) => (
                <div key={expense._id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-3xl hover:bg-gray-50 transition border border-gray-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Receipt size={28} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">{expense.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-gray-500">Paid by {expense.paidBy?.name || 'You'}</p>
                        {expense.group && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase rounded-lg tracking-wider">
                            {expense.group.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0">
                    <div className="text-left md:text-right">
                      <h3 className="text-2xl font-black text-gray-900">₹{expense.amount}</h3>
                      <p className="text-sm text-gray-500 uppercase tracking-widest font-medium mt-1">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                    {String(expense.createdBy?._id || expense.createdBy) === String(userId) && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/expenses/edit/${expense._id}?redirect=expenses`)}
                          className="p-3 rounded-2xl border border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition text-gray-400 shadow-sm"
                          title="Edit Expense"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense._id)}
                          disabled={deletingExpenseId === expense._id}
                          className="p-3 rounded-2xl border border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition text-gray-400 disabled:opacity-60 shadow-sm"
                          title="Delete Expense"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-500 text-lg">No expenses found matching your search.</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
