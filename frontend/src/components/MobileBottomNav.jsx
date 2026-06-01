import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [friendReqCount, setFriendReqCount] = useState(0);

  useEffect(() => {
    // Only fetch if logged in
    api.get('friends/requests').then(res => {
      setFriendReqCount(res.data.requests?.length || 0);
    }).catch(() => {});
  }, [location.pathname]);

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 lg:hidden w-[92%] bg-white/90 backdrop-blur-lg border border-gray-200 rounded-3xl shadow-2xl px-6 py-4 flex justify-between items-center z-50">
      <button onClick={() => navigate('/dashboard')} className={`flex flex-col items-center transition ${isActive('/dashboard') ? 'text-emerald-500 font-bold' : 'text-gray-500 font-medium'}`}>
        <span className="text-2xl">🏠</span>
        <span className="text-xs">Home</span>
      </button>

      <button onClick={() => navigate('/friends')} className={`flex flex-col items-center relative transition ${isActive('/friends') ? 'text-emerald-500 font-bold' : 'text-gray-500 font-medium'}`}>
        <span className="text-2xl">👥</span>
        <span className="text-xs">Friends</span>
        {friendReqCount > 0 && (
          <span className="absolute top-0 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
            {friendReqCount}
          </span>
        )}
      </button>

      <button onClick={() => navigate('/expenses/new')} className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 transition text-white text-3xl shadow-2xl -mt-10 flex items-center justify-center">
        +
      </button>

      <button onClick={() => navigate('/groups')} className={`flex flex-col items-center transition ${isActive('/groups') ? 'text-emerald-500 font-bold' : 'text-gray-500 font-medium'}`}>
        <span className="text-2xl">🏷️</span>
        <span className="text-xs">Groups</span>
      </button>

      <button onClick={() => navigate('/settings')} className={`flex flex-col items-center transition ${isActive('/settings') ? 'text-emerald-500 font-bold' : 'text-gray-500 font-medium'}`}>
        <span className="text-2xl">⚙️</span>
        <span className="text-xs">Settings</span>
      </button>
    </div>
  );
}
