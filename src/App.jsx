import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import SetupView from './components/SetupView';
import ManagerView from './components/ManagerView';
import { useTournamentStore } from './store/useTournamentStore';
import { supabase } from './lib/supabaseClient';
import ToastContainer from './components/ToastContainer';
import { toast } from './store/useToastStore';

function App() {
  const { currentView, loadFromSupabase } = useTournamentStore();
  const [isLoading, setIsLoading] = useState(true);
  const [invalidOtp, setInvalidOtp] = useState(false);

  useEffect(() => {
    const checkRoute = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const otp = params.get('otp');

      if (id) {
        let isHost = false;
        let hostTourneys = JSON.parse(localStorage.getItem('host_tournaments') || '[]');
        if (hostTourneys.includes(id)) {
          isHost = true;
        }

        if (otp) {
          try {
            const { data } = await supabase
              .from('tournaments')
              .select('otp')
              .eq('id', id)
              .single();
            
            if (data && data.otp === otp) {
              isHost = true;
              if (!hostTourneys.includes(id)) {
                hostTourneys.push(id);
                localStorage.setItem('host_tournaments', JSON.stringify(hostTourneys));
              }
              await supabase.from('tournaments').update({ otp: null }).eq('id', id);
              window.history.replaceState({}, '', `${window.location.pathname}?id=${id}`);
              toast.success("Akses Host Berhasil!");
            } else {
              setInvalidOtp(true);
              window.history.replaceState({}, '', `${window.location.pathname}?id=${id}`);
            }
          } catch(e) {}
        }
        
        await loadFromSupabase(id, isHost);
      }
      setIsLoading(false);
    };
    checkRoute();
  }, [loadFromSupabase]);

  if (isLoading) {
    return <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center text-emerald-400 font-bold">Loading...</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 w-full overflow-x-hidden">
      <ToastContainer />
      <Header />
      
      <main className="flex flex-1 overflow-hidden p-4 md:p-6 mx-auto w-full max-w-7xl gap-6 z-10 relative">
        <div className="flex-1 flex flex-col h-full overflow-y-auto hide-scrollbar scroll-smooth">
          {currentView === 'setup' || currentView === 'config' ? <SetupView /> : <ManagerView />}
        </div>
        
        {invalidOtp && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-600 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl">
              <h3 className="text-2xl font-bold text-red-400 mb-3">Link Invalid</h3>
              <p className="text-slate-300 mb-6 text-sm">Link share host tidak valid atau sudah digunakan. Anda masuk sebagai Read-Only.</p>
              <button onClick={() => setInvalidOtp(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-bold transition">Mengerti</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
