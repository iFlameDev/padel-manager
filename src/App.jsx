import { useEffect } from 'react';
import Header from './components/Header';
import SetupView from './components/SetupView';
import ManagerView from './components/ManagerView';
import { useTournamentStore } from './store/useTournamentStore';
import ToastContainer from './components/ToastContainer';

function App() {
  const { currentView, loadFromHistory, isTournamentStarted } = useTournamentStore();

  // Initialize offline tournament state from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (id) {
      loadFromHistory(id);
    } else {
      try {
        const history = JSON.parse(localStorage.getItem('padel_history') || '[]');
        if (history.length > 0 && history[0].id) {
          const lastTourney = history[0];
          if (lastTourney.state && lastTourney.state.isTournamentStarted) {
            loadFromHistory(lastTourney.id);
          }
        }
      } catch (e) {
        console.error('Failed to restore from history', e);
      }
    }
  }, [loadFromHistory]);

  // Prevent accidental page reload or navigation when tournament is active
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isTournamentStarted) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTournamentStarted]);

  // Handle browser back button to prevent accidental exit
  useEffect(() => {
    if (isTournamentStarted) {
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => {
        if (isTournamentStarted) {
          const confirmExit = window.confirm("Pertandingan sedang berjalan. Apakah Anda yakin ingin kembali / keluar?");
          if (!confirmExit) {
            window.history.pushState(null, '', window.location.href);
          }
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isTournamentStarted]);

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 w-full overflow-x-hidden">
      <ToastContainer />
      <Header />
      
      <main className="flex flex-1 overflow-hidden p-4 md:p-6 mx-auto w-full max-w-7xl gap-6 relative">
        <div className="flex-1 flex flex-col h-full overflow-y-auto hide-scrollbar scroll-smooth">
          {currentView === 'setup' || currentView === 'config' ? <SetupView /> : <ManagerView />}
        </div>
      </main>
    </div>
  );
}

export default App;
