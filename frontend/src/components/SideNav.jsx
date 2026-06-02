import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/friends', label: 'Balances', icon: '⚖️' },
  { href: '/groups', label: 'Groups', icon: '🧾' },
  { href: '/activity', label: 'Activity', icon: '⚡' },
  { href: '/analytics', label: 'Analytics', icon: '📊' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

const SideNav = () => {
  const location = useLocation();
  
  const currentItem = navItems.find((item) => location.pathname.startsWith(item.href));
  const pageName = currentItem ? currentItem.label : 'Overview';

  return (
    <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200 bg-white p-6 h-full min-h-screen">
      <div className="mb-10 flex items-center gap-3">
        <img src="/logo.png?v=1" alt="SettleUp Logo" className="w-12 h-12 object-contain shrink-0" />
        <div>
          <p className="text-sm text-slate-500">SettleUp</p>
          <h2 className="text-xl font-bold text-slate-900">{pageName}</h2>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 rounded-3xl px-4 py-4 text-sm font-medium transition ${
                active ? 'bg-emerald-50 text-emerald-600' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[30px] bg-emerald-50 p-5 text-slate-700">
        <p className="text-sm font-semibold">Stay organized</p>
        <p className="mt-2 text-sm text-slate-500">Access friends, groups, activity and analytics from anywhere.</p>
      </div>
    </aside>
  );
};

export default SideNav;
