import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const MobileTopMenu = ({ friendReqCount = 0, unreadNotifCount = 0 }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

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

  return (
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
          {user?.isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="px-5 py-4 text-left font-medium text-red-600 bg-red-50 hover:bg-red-100 flex items-center gap-2 border-b border-red-100"
            >
              🛡️ Admin Dashboard
            </button>
          )}
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
  );
};

export default MobileTopMenu;
