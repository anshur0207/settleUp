import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { minimizeDebts } from '../utils/smartSplit.js';
import { ChevronLeft, Scale, ArrowRight, Wallet } from 'lucide-react';
import LoadingAndErrorStates from './LoadingAndErrorStates.jsx';

export default function GroupBalances() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const loadGroup = async () => {
        try {
          const response = await api.get(`/groups/${id}`);
          setGroup(response.data.group);
          setSettlements(response.data.settlements || []);
        } catch (err) {
          console.error('Unable to load group', err);
        } finally {
          setPageLoading(false);
        }
      };
      loadGroup();
    }
  }, [id]);

  const { memberBalances, totalExpenses, calculatedSettlements } = useMemo(() => {
    if (!group) return { memberBalances: [], totalExpenses: 0, calculatedSettlements: [] };

    const netBalances = {};
    const groupMembers = group.members || [];
    
    groupMembers.forEach(m => {
      netBalances[m.id] = 0;
    });
    
    let totalExp = 0;

    (group.expenses || []).forEach(expense => {
      totalExp += expense.amount || 0;
      const paidBy = String(expense.paidBy?.id || expense.paidBy);
      expense.splits?.forEach(split => {
        const userId = String(split.user?.id || split.user);
        const owed = split.owed ?? split.amount ?? 0;
        if (userId !== paidBy && owed > 0) {
          netBalances[userId] = (netBalances[userId] || 0) - owed;
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
    
    const formattedSettlements = optimized.map(t => {
      const fromUser = groupMembers.find(m => String(m.id) === String(t.from));
      const toUser = groupMembers.find(m => String(m.id) === String(t.to));
      return {
        from: fromUser?.name || 'Unknown',
        fromAvatar: fromUser?.avatar,
        to: toUser?.name || 'Unknown',
        toAvatar: toUser?.avatar,
        amount: Number(t.amount.toFixed(2))
      };
    }).filter(t => t.amount > 0.01);

    const balances = Object.entries(netBalances)
      .map(([memberId, amount]) => {
        const member = groupMembers.find(m => String(m.id) === memberId);
        return {
          id: memberId,
          name: member?.name || 'Unknown',
          avatar: member?.avatar,
          amount: Number(amount.toFixed(2)),
        };
      })
      .sort((a, b) => b.amount - a.amount); // Sort Highest owed to Highest owing

    return { memberBalances: balances, totalExpenses: totalExp, calculatedSettlements: formattedSettlements };
  }, [group, settlements]);

  if (pageLoading) {
    return <LoadingAndErrorStates status="loading" message="Loading group balances..." />;
  }

  if (!group) {
    return <LoadingAndErrorStates status="network" message="Group not found." />;
  }

  return (
    <div className="min-h-screen bg-[#f6f9f7] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-3">
              <button type="button" onClick={() => navigate(`/groups/${id}`)} className="flex items-center gap-2 hover:text-emerald-500 transition font-medium">
                <ChevronLeft size={18} />
                Back to {group.name}
              </button>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 mt-1">Total Balances ⚖️</h1>
            <p className="text-gray-500 mt-2 md:mt-3 text-sm md:text-lg">Transparent view of who owes who in this group.</p>
          </div>
          
          <div className="bg-white px-6 py-4 rounded-2xl md:rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Group Total</p>
              <h3 className="text-2xl font-black text-gray-900">₹{totalExpenses.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          
          <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-8 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                <Scale size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900">Net Balances</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-medium">Overall standing per member</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {memberBalances.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-4">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg shadow-sm">
                        {member.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">{member.name}</h3>
                      <p className={`text-xs font-bold ${member.amount > 0 ? 'text-emerald-500' : member.amount < 0 ? 'text-rose-500' : 'text-gray-500'}`}>
                        {member.amount > 0 ? 'Gets back' : member.amount < 0 ? 'Owes' : 'Settled up'}
                      </p>
                    </div>
                  </div>
                  <h3 className={`text-xl font-black ${member.amount > 0 ? 'text-emerald-500' : member.amount < 0 ? 'text-rose-500' : 'text-gray-900'}`}>
                    {member.amount > 0 ? '+' : ''}{member.amount === 0 ? '₹0' : `₹${Math.abs(member.amount).toLocaleString()}`}
                  </h3>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-8 shadow-lg border border-gray-100">
             <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm">
                <ArrowRight size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900">Who Owes Who</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-medium">Optimal payments to settle all debts</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {calculatedSettlements.length > 0 ? (
                calculatedSettlements.map((settlement, index) => (
                  <div key={index} className="flex flex-col p-4 rounded-2xl bg-gray-50 border border-gray-100 gap-3 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {settlement.fromAvatar ? (
                          <img src={settlement.fromAvatar} alt={settlement.from} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold shadow-sm">
                            {settlement.from?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <h3 className="font-bold text-gray-900 text-sm">{settlement.from}</h3>
                      </div>
                      <div className="flex-1 flex items-center justify-center px-4">
                         <div className="h-[2px] bg-gray-200 flex-1 rounded-full relative">
                           <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                         </div>
                      </div>
                      <div className="flex items-center gap-3 flex-row-reverse">
                        {settlement.toAvatar ? (
                          <img src={settlement.toAvatar} alt={settlement.to} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shadow-sm">
                            {settlement.to?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <h3 className="font-bold text-gray-900 text-sm">{settlement.to}</h3>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-black text-sm">
                        ₹ {settlement.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100">
                   <p className="text-gray-500 font-semibold">Everyone is completely settled up! 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
