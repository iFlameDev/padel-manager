import { useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { Settings, CopyPlus, Eye, EyeOff, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

export default function Header() {
  const { currentView, setView, isHost, showBadges, toggleBadges, isTournamentStarted, resetTournament } = useTournamentStore();
  const [toastMsg, setToastMsg] = useState(null);
  
  const isTestingRoute = typeof window !== 'undefined' && window.location.href.includes('testing');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRandomTest = () => {
    const namesPool = ["Theo", "Budi", "Andi", "Clara", "Kevin", "Rara", "Maya", "Surya", "Hermine", "Dika", "Reza", "Gilang", "Nisa", "Tono", "Putri", "Raditya", "Sisca", "Fajar", "Ayu", "Joko"];
    const tiersPool = ["A", "B", "C", "D"];
    let randomPlayerCount = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
    let randomCourts = randomPlayerCount >= 15 ? 3 : randomPlayerCount >= 10 ? 2 : 1;
    
    let shuffledNames = namesPool.sort(() => 0.5 - Math.random());
    let selectedNames = shuffledNames.slice(0, randomPlayerCount);
    
    let generatedPlayers = selectedNames.map(name => {
      let randTier = tiersPool[Math.floor(Math.random() * tiersPool.length)];
      return {
        name,
        tier: randTier,
        isInactive: false,
        pid: null
      };
    });

    window.dispatchEvent(new CustomEvent('generate-random-test', { detail: { generatedPlayers, randomCourts } }));
    showToast("Data uji coba berhasil di-generate!");
  };

  const handleResetTournament = () => {
    if (window.confirm("Keluar dan buat turnamen baru? Turnamen yang sedang berjalan tetap tersimpan di History.")) {
      resetTournament();
    }
  };

  const isSetup = currentView === 'setup';
  const isManager = currentView === 'manager';
  const isConfig = currentView === 'config';

  return (
    <header className="shrink-0 mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-7xl bg-slate-800 shadow-lg p-4 rounded-2xl flex flex-row justify-between items-center gap-4 mt-4 z-30">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-emerald-400 tracking-tight">Padel Manager</h1>
            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono uppercase tracking-wider border border-slate-600">
              Offline
            </span>
          </div>
          <p className="text-amber-400 font-mono mt-0.5 text-xs">Powered by iFlameDev</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isSetup && isTestingRoute && (
          <button onClick={handleRandomTest} className="text-xs bg-blue-600/90 hover:bg-blue-500 text-white px-3 py-2.5 rounded-lg transition font-bold shadow flex items-center gap-1.5 shrink-0">
            <CopyPlus className="w-4 h-4" />
            Random Test
          </button>
        )}
        
        {(isManager || isConfig) && (
          <>
            {/* Toggle Badges (Mata Buka / Tutup) */}
            <button 
              onClick={toggleBadges}
              className={clsx(
                "p-2.5 rounded-lg transition shadow shrink-0 flex items-center gap-2",
                showBadges ? "bg-slate-700/80 hover:bg-slate-600 text-emerald-400" : "bg-slate-800 text-slate-500 hover:text-slate-400 border border-slate-700"
              )}
              title={showBadges ? "Sembunyikan Badge Lapangan & Tier" : "Tampilkan Badge Lapangan & Tier"}
            >
              {showBadges ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>

            {/* Config Toggle */}
            {isHost && (
              <button 
                onClick={() => isConfig ? setView('manager') : setView('config')} 
                className={clsx(
                  "p-2.5 rounded-lg transition shadow shrink-0",
                  isConfig ? "bg-emerald-600/90 hover:bg-emerald-500 text-white" : "bg-slate-700/80 hover:bg-slate-600 text-slate-300"
                )}
                title="Config Turnamen"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            {/* New Tournament / Return to Setup */}
            {isTournamentStarted && (
              <button
                onClick={handleResetTournament}
                className="p-2.5 rounded-lg transition shadow shrink-0 bg-slate-700/80 hover:bg-red-900/40 text-slate-300 hover:text-red-300 border border-slate-600"
                title="Turnamen Baru (Keluar ke Setup)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 bg-slate-800 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-5">
          <span className="font-bold text-sm">{toastMsg}</span>
        </div>
      )}
    </header>
  );
}
