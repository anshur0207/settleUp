import { Outlet } from 'react-router-dom';
import SideNav from './SideNav.jsx';
import MobileBottomNav from './MobileBottomNav.jsx';

const AppLayout = () => {
  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex overflow-hidden">
      <SideNav />
      <main className="flex-1 h-screen overflow-x-hidden overflow-y-auto bg-slate-50 pb-28 lg:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default AppLayout;
