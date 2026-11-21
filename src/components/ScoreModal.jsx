import { createPortal } from 'react-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreModal({ isOpen, matchKey, teamIndex, onClose }) {
  const { config, matches, players, customCourtNames, setScore, isHost } = useTournamentStore();

  if (!isOpen || !matchKey || !isHost) return null;

  const m = matches[matchKey];
  if (!m) return null;
  const isMatchScored = m.score1 !== null && m.score2 !== null;
  const hasMissingPlayers = !isMatchScored && [...m.t1, ...m.t2].some((id) => (
    id === null || !players.some((player) => player.id === id && !player.isWalkout)
  ));

  const tId1 = teamIndex === 1 ? m.t1[0] : m.t2[0];
  const tId2 = teamIndex === 1 ? m.t1[1] : m.t2[1];
  
  const p1 = players.find(x => x.id === tId1) || { name: 'Pemain 1' };
  const p2 = players.find(x => x.id === tId2) || { name: 'Pemain 2' };
  const cName = customCourtNames[m.court] || `Court ${m.court}`;

  const max = Number.isInteger(config.maxPoints) && config.maxPoints > 0 ? config.maxPoints : 21;
  const gridButtons = [];
  for (let i = 0; i <= max; i++) {
    gridButtons.push(
      <button 
        key={i} 
        onClick={() => { setScore(matchKey, i, teamIndex); onClose(); }} 
        className="bg-slate-700/80 hover:bg-blue-600 text-white font-bold py-3 md:py-4 rounded-xl transition shadow hover:shadow-blue-500/50"
      >
        {i}
      </button>
    );
  }

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-800 border border-slate-600 rounded-3xl shadow-2xl max-w-sm w-full p-5 md:p-6 relative flex flex-col"
        >
          <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-white transition bg-slate-700/50 rounded-full p-1.5">
            <X className="w-5 h-5" />
          </button>
          
          <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700/50 pb-3 flex items-center gap-2 tracking-tight">
            Edit Score <span className="px-2 py-0.5 rounded shadow-sm border border-slate-600 bg-slate-900/50 text-[12px] align-middle font-mono text-slate-300">{cName}</span>
          </h3>
          
          <p className="text-center text-2xl text-emerald-400 mb-6 font-bold tracking-tight leading-tight mt-2">
            {p1.name} <span className="text-slate-500 text-lg">&amp;</span> {p2.name}
          </p>
          
          {hasMissingPlayers ? (
            <p className="text-center text-sm text-amber-300 bg-amber-900/20 border border-amber-800/50 rounded-xl p-3">
              Lengkapi slot pemain melalui pengaturan pertandingan sebelum memasukkan skor.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-2.5">
                {gridButtons}
              </div>
              <div className="mt-8 flex justify-center">
                <button onClick={() => { setScore(matchKey, null, teamIndex); onClose(); }} className="text-xs bg-red-900/40 hover:bg-red-600 text-red-300 hover:text-white border border-red-700/50 py-3 px-8 rounded-xl transition font-bold tracking-widest uppercase">
                  Reset Score
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
