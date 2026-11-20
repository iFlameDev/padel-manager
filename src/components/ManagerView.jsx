import React, { useState } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import clsx from 'clsx';
import { Check, Edit3, LayoutList, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScoreModal from './ScoreModal';
import SwapModal from './SwapModal';
import Leaderboard from './Leaderboard';

function getTierStyle(tier) {
  switch (tier) {
    case 'A': return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
    case 'B': return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
    case 'C': return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
    case 'D': return 'bg-rose-900/40 text-rose-300 border-rose-700/50';
    default: return 'bg-slate-800 text-slate-300 border-slate-600';
  }
}

export default function ManagerView() {
  const { 
    currentView, config, numCourts, customCourtNames, players, teams,
    matches, currentRound, activeRoundTab, setActiveRoundTab,
    getBalanceText, triggerNextRound, isHost
  } = useTournamentStore();

  const [managerTab, setManagerTab] = useState('rounds'); // 'rounds' or 'leaderboard'
  const [scoreModalState, setScoreModalState] = useState({ isOpen: false, matchKey: null, teamIndex: null });
  const [swapModalState, setSwapModalState] = useState({ isOpen: false, matchKey: null });

  if (currentView !== 'manager') return null;

  const rounds = Array.from({ length: currentRound }, (_, i) => i + 1);
  const activeMatches = Object.values(matches).filter(m => m.round === activeRoundTab);
  const showMarking = config.type.includes('marked');
  const activeCount = players.filter(p => !p.isWalkout).length;

  let latestMatches = {};
  for (let i = 1; i <= numCourts; i++) {
     let courtMatches = Object.values(matches).filter(m => m.court === i);
     if (courtMatches.length > 0) {
        latestMatches[i] = courtMatches.reduce((max, m) => m.round > max.round ? m : max, courtMatches[0]);
     }
  }

  let readyCourts = [];
  for (let i = 1; i <= numCourts; i++) {
     let lm = latestMatches[i];
     if (lm && lm.score1 !== null && lm.score2 !== null) {
        readyCourts.push(i);
     }
  }
  
  const hasFinishedButNoNextRound = activeMatches.some(m => {
    if (m.score1 === null || m.score2 === null) return false;
    return !Object.values(matches).some(nm => nm.court === m.court && nm.round > activeRoundTab);
  });
  
  const isLatestRoundTab = activeRoundTab === currentRound;
  
  return (
    <div className="w-full flex flex-col h-full fade-in relative bg-slate-900">
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        {/* Top Info Card */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-4 shadow-sm flex-shrink-0">
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-3 mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white tracking-tight">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
              {config.name || 'Padel Tournament'}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">{config.type.replace('_',' ').toUpperCase()}</div>
            <div className="flex items-center justify-end gap-1.5">{activeCount} Players • {numCourts} Courts</div>
            <div className="flex items-center gap-1.5">{config.maxPoints} Points Max</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-center text-xs font-bold text-emerald-400">
            Balance in: {getBalanceText()}
          </div>
        </div>

        <AnimatePresence mode="wait">
        {managerTab === 'rounds' ? (
          <motion.div 
            key="rounds"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Pager Slider */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-2 flex-shrink-0 pt-2 pb-2 pl-1">
              {rounds.map(r => {
                const roundMatches = Object.values(matches).filter(m => m.round === r);
                const isComplete = roundMatches.length === numCourts && roundMatches.every(m => m.score1 !== null && m.score2 !== null);
                const isActive = r === activeRoundTab;

                return (
                  <button
                    key={r}
                    onClick={() => setActiveRoundTab(r)}
                    className={clsx(
                      "relative px-5 py-2 rounded-lg font-bold text-sm min-w-fit transition shadow",
                      isActive ? "bg-blue-600 text-white ring-2 ring-blue-400/50" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                    )}
                  >
                    Round {r}
                    {isComplete && (
                      <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow border border-slate-900">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Matches Bracket */}
            <div className="w-full mt-4">
              {activeMatches.length === 0 ? (
                <div className="text-center text-slate-500 mt-10 italic">Menyiapkan Turnamen...</div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-10 pb-4">
                  {Array.from({ length: numCourts }).map((_, i) => {
                    const courtNum = i + 1;
                    const m = activeMatches.find(x => x.court === courtNum);
                    const cName = customCourtNames[courtNum] || `Court ${courtNum}`;

                    if (!m) {
                      return (
                        <div key={`empty-r${activeRoundTab}-c${courtNum}`} className="relative bg-slate-800/40 rounded-xl shadow-inner border border-dashed border-slate-700 flex flex-col items-center justify-center min-h-[100px] mt-4 opacity-60">
                          <div className="text-slate-500 font-medium text-[13px] text-center px-4 italic">
                            Menunggu putaran sebelumnya selesai
                          </div>
                          <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[11px] bg-slate-900 text-slate-500 px-4 py-1.5 rounded-full border border-slate-800 flex gap-2 items-center z-20">
                            {cName}
                          </div>
                        </div>
                      );
                    }

                    const matchKey = `r${m.round}-c${m.court}`;
                    const fallback = { name: 'Pilih Pemain', tier: '-' };
                    const p1 = players.find(x => x.id === m.t1[0]) || fallback;
                    const p2 = players.find(x => x.id === m.t1[1]) || fallback;
                    const p3 = players.find(x => x.id === m.t2[0]) || fallback;
                    const p4 = players.find(x => x.id === m.t2[1]) || fallback;

                    const team1Obj = (m.t1[0] && m.t1[1]) ? (teams || []).find(t => 
                      (t.playerIds[0] === m.t1[0] && t.playerIds[1] === m.t1[1]) ||
                      (t.playerIds[0] === m.t1[1] && t.playerIds[1] === m.t1[0])
                    ) : null;

                    const team2Obj = (m.t2[0] && m.t2[1]) ? (teams || []).find(t => 
                      (t.playerIds[0] === m.t2[0] && t.playerIds[1] === m.t2[1]) ||
                      (t.playerIds[0] === m.t2[1] && t.playerIds[1] === m.t2[0])
                    ) : null;

                    const courtHasNext = Object.values(matches).some(nm => nm.court === m.court && nm.round > activeRoundTab);
                    const isLocked = config.type.includes('mexicano') && courtHasNext;

                    const s1 = m.score1 !== null ? String(m.score1).padStart(2,'0') : '00';
                    const s2 = m.score2 !== null ? String(m.score2).padStart(2,'0') : '00';

                    let sc1 = 'bg-slate-700 text-slate-300 border-slate-600';
                    let sc2 = 'bg-slate-700 text-slate-300 border-slate-600';
                    let t1WinClass = '';
                    let t2WinClass = '';

                    if (m.score1 !== null && m.score2 !== null) {
                      if (m.score1 > m.score2) {
                        sc1 = 'bg-blue-500 text-white border-blue-600 shadow-blue-500/20';
                        sc2 = 'bg-slate-700 text-slate-400 border-slate-600';
                        t1WinClass = 'bg-blue-900/20';
                      } else if (m.score2 > m.score1) {
                        sc2 = 'bg-blue-500 text-white border-blue-600 shadow-blue-500/20';
                        sc1 = 'bg-slate-700 text-slate-400 border-slate-600';
                        t2WinClass = 'bg-blue-900/20';
                      }
                    }

                    const renderTier = (tier) => showMarking && tier !== '-' ? (
                      <span className={clsx("text-[8px] px-1 py-0.5 rounded border font-mono", getTierStyle(tier))}>{tier}</span>
                    ) : null;

                    return (
                      <div key={matchKey} className="relative bg-slate-800 rounded-xl shadow border border-slate-700 group mt-4 hover:border-slate-600 transition">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                          <div onClick={() => isHost && !isLocked && setScoreModalState({ isOpen: true, matchKey, teamIndex: 1 })} className={clsx("w-14 h-14 flex items-center justify-center font-bold text-3xl rounded-xl shadow transition transform border", isHost && !isLocked ? "cursor-pointer active:scale-95 hover:bg-slate-600" : "cursor-default opacity-90", sc1)}>
                            {s1}
                          </div>
                          <div onClick={() => isHost && !isLocked && setScoreModalState({ isOpen: true, matchKey, teamIndex: 2 })} className={clsx("w-14 h-14 flex items-center justify-center font-bold text-3xl rounded-xl shadow transition transform border", isHost && !isLocked ? "cursor-pointer active:scale-95 hover:bg-slate-600" : "cursor-default opacity-90", sc2)}>
                            {s2}
                          </div>
                        </div>

                        <div className="flex h-full min-h-[100px]">
                          <div onClick={() => isHost && !isLocked && setScoreModalState({ isOpen: true, matchKey, teamIndex: 1 })} className={clsx("w-1/2 pt-6 pb-6 border-r border-slate-700 px-3 sm:px-5 flex flex-col justify-center gap-3 transition rounded-l-xl", isHost && !isLocked ? "cursor-pointer hover:bg-slate-700/50" : "cursor-default", t1WinClass)}>
                            {team1Obj && (
                               <div className="absolute -top-2.5 left-4 text-[10px] font-bold text-indigo-400 bg-slate-900 px-2 py-0.5 rounded-md border border-indigo-700/50 uppercase tracking-wide shadow-sm z-10">{team1Obj.name}</div>
                            )}
                            <div className="text-[15px] font-medium text-slate-200 truncate flex items-center gap-2">{renderTier(p1.tier)} {p1.name}</div>
                            <div className="text-[15px] font-medium text-slate-200 truncate flex items-center gap-2">{renderTier(p2.tier)} {p2.name}</div>
                          </div>
                          <div onClick={() => isHost && !isLocked && setScoreModalState({ isOpen: true, matchKey, teamIndex: 2 })} className={clsx("w-1/2 pt-6 pb-6 px-3 sm:px-5 flex flex-col justify-center gap-3 text-right transition rounded-r-xl", isHost && !isLocked ? "cursor-pointer hover:bg-slate-700/50" : "cursor-default", t2WinClass)}>
                            {team2Obj && (
                               <div className="absolute -top-2.5 right-4 text-[10px] font-bold text-indigo-400 bg-slate-900 px-2 py-0.5 rounded-md border border-indigo-700/50 uppercase tracking-wide shadow-sm z-10">{team2Obj.name}</div>
                            )}
                            <div className="text-[15px] font-medium text-slate-200 truncate flex items-center justify-end gap-2">{p3.name} {renderTier(p3.tier)}</div>
                            <div className="text-[15px] font-medium text-slate-200 truncate flex items-center justify-end gap-2">{p4.name} {renderTier(p4.tier)}</div>
                          </div>
                        </div>

                        {isHost && !isLocked && (
                          <div onClick={() => setSwapModalState({ isOpen: true, matchKey })} className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[11px] bg-slate-900 text-slate-300 px-4 py-1.5 rounded-full border border-slate-700 flex gap-2 items-center cursor-pointer hover:bg-slate-800 transition shadow z-20 whitespace-nowrap">
                            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                            {cName}
                            {courtHasNext && <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />}
                          </div>
                        )}
                        {(!isHost || isLocked) && (
                          <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[11px] bg-slate-900 text-slate-500 px-4 py-1.5 rounded-full border border-slate-800 flex gap-2 items-center z-20 whitespace-nowrap">
                            {cName}
                            {courtHasNext && <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Next Round Button */}
              {hasFinishedButNoNextRound && isHost && (
                <div className="mt-8 mb-6 flex justify-center">
                  <button
                    onClick={() => triggerNextRound()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-900/50 transition transform hover:scale-105 active:scale-95 border border-emerald-500 w-full md:w-auto"
                  >
                    Generate Next Round
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="leaderboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="mt-4 border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-slate-900"
          >
            <Leaderboard />
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-30 pb-safe shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto flex">
          <button 
            onClick={() => setManagerTab('rounds')}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center py-3 transition",
              managerTab === 'rounds' ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <CalendarDays className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold">Rounds</span>
          </button>
          <div className="w-px bg-slate-800 my-2"></div>
          <button 
            onClick={() => setManagerTab('leaderboard')}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center py-3 transition",
              managerTab === 'leaderboard' ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <LayoutList className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold">Leaderboard</span>
          </button>
        </div>
      </div>

      <ScoreModal 
        isOpen={scoreModalState.isOpen} 
        matchKey={scoreModalState.matchKey} 
        teamIndex={scoreModalState.teamIndex} 
        onClose={() => setScoreModalState({ isOpen: false, matchKey: null, teamIndex: null })} 
      />
      <SwapModal 
        isOpen={swapModalState.isOpen} 
        matchKey={swapModalState.matchKey} 
        onClose={() => setSwapModalState({ isOpen: false, matchKey: null })} 
      />
    </div>
  );
}
