"use client";

import { useEffect, useState } from 'react';
import {
  WifiOff,
  Database,
  RefreshCcw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import api from '../services/api.js';

export default function LoadingAndErrorStates({ status: propStatus, message: propMessage, onRetry: propOnRetry }) {
  const [internalStatus, setInternalStatus] = useState('loading');
  const [internalMessage, setInternalMessage] = useState('Fetching latest expenses, balances and groups.');
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const status = propStatus || internalStatus;
  const message = propMessage || internalMessage;
  const handleRetry = propOnRetry || loadData;

  const loadData = async () => {
    if (propStatus) return; // Do not fetch internal data if controlled by props
    setInternalStatus('loading');
    setInternalMessage('Fetching latest expenses, balances and groups.');

    try {
      const [groupsRes, expensesRes] = await Promise.all([api.get('groups'), api.get('expenses')]);
      setGroups(groupsRes.data.groups || []);
      setExpenses(expensesRes.data.expenses || []);
      setInternalStatus('success');
      setInternalMessage('Data loaded successfully from the database.');
    } catch (error) {
      const response = error?.response;

      if (response) {
        const serverMessage = response.data?.message || 'Something went wrong while fetching your data.';
        if (response.status >= 500) {
          setInternalStatus('database');
          setInternalMessage(serverMessage);
        } else {
          setInternalStatus('network');
          setInternalMessage(serverMessage);
        }
      } else {
        setInternalStatus('network');
        setInternalMessage('Unable to connect to the server. Please check your internet connection.');
      }
    }
  };

  useEffect(() => {
    if (!propStatus) {
      loadData();
    }
  }, [propStatus]);

  const renderButton = (label, colorClass) => (
    <button
      onClick={handleRetry}
      className={`mt-8 h-14 px-8 rounded-2xl ${colorClass} hover:opacity-95 transition text-white font-bold shadow-lg inline-flex items-center gap-3`}
    >
      <RefreshCcw size={20} />
      {label}
    </button>
  );

  const wrapperClass = propStatus
    ? "w-full py-20 flex flex-col gap-10 items-center justify-center"
    : "min-h-screen bg-[#f6f9f7] p-6 flex flex-col gap-10 items-center justify-center";

  return (
    <div className={wrapperClass}>
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center mt-20">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
          <p className="mt-4 text-emerald-600 font-medium">Loading data...</p>
        </div>
      )}

      {status === 'network' && (
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl border border-gray-100 p-10 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <WifiOff className="text-red-500" size={42} />
          </div>

          <h1 className="text-3xl font-black text-gray-900 mt-8">Database is Not Connected</h1>

          <p className="text-gray-500 text-lg mt-4 leading-relaxed">{message}</p>

          {renderButton('Retry Connection', 'bg-red-500')}
        </div>
      )}

      {status === 'database' && (
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl border border-gray-100 p-10 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-orange-100 flex items-center justify-center">
            <Database className="text-orange-500" size={42} />
          </div>

          <h1 className="text-3xl font-black text-gray-900 mt-8">Database Issue</h1>

          <p className="text-gray-500 text-lg mt-4 leading-relaxed">
            Something went wrong while fetching your expenses.
            <br />{message}
          </p>

          <div className="mt-8 bg-orange-50 border border-orange-100 rounded-2xl p-5 flex items-start gap-4 text-left">
            <AlertTriangle className="text-orange-500 mt-1" size={22} />
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Temporary Service Issue</h3>
              <p className="text-gray-500 mt-2 leading-relaxed">
                Please wait a few minutes and try again.
              </p>
            </div>
          </div>

          {renderButton('Try Again', 'bg-emerald-500')}
        </div>
      )}

    </div>
  );
}
