import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import PublicLeaderboard from './components/PublicLeaderboard';
import DataWarehouse from './components/DataWarehouse';
import PenaltyLog from './components/PenaltyLog';
import Dashboards from './components/Dashboards';
import AdminPortal from './components/AdminPortal';

export default function App() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setActiveTab('leaderboard');
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'leaderboard':
        return <PublicLeaderboard />;
      case 'warehouse':
        return <DataWarehouse />;
      case 'penalties':
        return <PenaltyLog />;
      case 'dashboards':
        return <Dashboards />;
      case 'admin':
        return <AdminPortal session={session} setSession={setSession} />;
      default:
        return <PublicLeaderboard />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 min-h-screen text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="fade-in">
          {renderActiveView()}
        </div>
      </main>

      <footer className="py-6 border-t border-slate-900/60 text-center text-xs text-slate-600 bg-slate-950/40 backdrop-blur-sm mt-auto">
        <p>© 2026 ACC Sim League. Powered by ACC Telemetry & Supabase.</p>
      </footer>
    </div>
  );
}
