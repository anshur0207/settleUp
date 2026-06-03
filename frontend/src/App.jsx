import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Friends from './pages/Friends.jsx';
import Groups from './pages/Groups.jsx';
import Activity from './pages/Activity.jsx';
import Profile from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';
import Analytics from './pages/Analytics.jsx';
import GroupDetails from './pages/GroupDetails.jsx';
import GroupBalances from './pages/GroupBalances.jsx';
import Settings from './pages/Settings.jsx';
import AddExpense from './pages/AddExpense.jsx';
import Expenses from './pages/Expenses.jsx';
import LoadingAndErrorStates from './pages/LoadingAndErrorStates.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';

function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
            <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/:id/balances" element={<GroupBalances />} />
                <Route path="/groups/:id" element={<GroupDetails />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/expenses/new" element={<AddExpense />} />
                <Route path="/expenses/edit/:expenseId" element={<AddExpense />} />
                <Route path="/issues" element={<LoadingAndErrorStates />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;
