import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTournamentStore } from '../store/useTournamentStore';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { toast } from '../store/useToastStore';

function getTierStyle(tier) {
  switch (tier) {
    case 'A': return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
    case 'B': return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
    case 'C': return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
    case 'D': return 'bg-rose-900/40 text-rose-300 border-rose-700/50';
    default: return 'bg-slate-800 text-slate-300 border-slate-600';
  }
}

function SlotButton({ playerObj, team, index, teamObj, teamPlayers, matches, selectedSlot, lastSwappedSlot, showMarking, onSelect }) {
  const isSelected = selectedSlot?.team === team && selectedSlot?.index === index;
  const isAnimating = lastSwappedSlot === `${team}-${index}`;
  
  let pStats = 0;
  if (playerObj) {
    pStats = Object.values(matches).reduce((acc, mx) => acc + (mx.score1 !== null && (mx.t1.includes(playerObj.id) || mx.t2.includes(playerObj.id)) ? 1 : 0), 0);
  }

  return (
    <motion.button
      animate={isAnimating ? { 
        scale: [1, 1.1, 1], 
        backgroundColor: ["#1e293b", "#059669", "#1e293b"],
        boxShadow: ["0px 0px 0px rgba(16,185,129,0)", "0px 0px 20px rgba(16,185,129,0.8)", "0px 0px 0px rgba(16,185,129,0)"],
        y: [0, -5, 0]
      } : {}}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      onClick={() => onSelect({ team, index })}
      className={clsx(
        "w-full py-3 px-3 rounded-xl text-center text-[13px] font-bold transition border",
        isSelected ? "bg-emerald-600/90 border-emerald-400 text-white ring-2 ring-emerald-300" : "bg-slate-800 border-slate-600/80 text-slate-300 hover:bg-slate-700 hover:border-slate-500",
        teamObj ? "h-[100px] flex flex-col justify-center items-center gap-1 border-indigo-700/50 bg-indigo-900/20" : ""
      )}
    >
      {teamObj ? (
        <>
          <div className="text-[14px] text-indigo-400 mb-1 uppercase tracking-wider">{teamObj.name}</div>
          <div className="text-[11px] font-medium text-slate-300">{teamPlayers[0]?.name || '?'}</div>
          <div className="text-[11px] font-medium text-slate-300">{teamPlayers[1]?.name || '?'}</div>
        </>
      ) : playerObj ? (
        <div className="flex items-center justify-center gap-1.5">
          {showMarking && playerObj.tier !== '-' && (
            <span className={clsx("text-[9px] px-1 py-0.5 rounded border font-mono", getTierStyle(playerObj.tier))}>{playerObj.tier}</span>
          )}
          <span className="truncate max-w-[100px]">{playerObj.name}</span>
          <span className="text-[10px] text-slate-400 font-normal ml-1">({pStats})</span>
        </div>
      ) : (
        <div className="opacity-50 font-bold text-sm my-auto text-slate-500">Kosong</div>
      )}
    </motion.button>
  );
}

export default function SwapModal({ isOpen, matchKey, onClose }) {
  const { matches, players, teams, customCourtNames, executeSwap, config, showBadges } = useTournamentStore();
  const showMarking = config.type.includes('marked') && showBadges;
  const [selectedSlot, setSelectedSlot] = useState(null); // { team: 1|2, index: 0|1 }
  const [lastSwappedSlot, setLastSwappedSlot] = useState(null);

  const handleClose = () => {
    setSelectedSlot(null);
    setLastSwappedSlot(null);
    onClose();
  };

  if (!isOpen || !matchKey) return null;

  const m = matches[matchKey];
  if (!m) return null;

  const team1Obj = (m.t1[0] && m.t1[1]) ? (teams || []).find(t => 
    (t.playerIds[0] === m.t1[0] && t.playerIds[1] === m.t1[1]) ||
    (t.playerIds[0] === m.t1[1] && t.playerIds[1] === m.t1[0])
  ) : null;

  const team2Obj = (m.t2[0] && m.t2[1]) ? (teams || []).find(t => 
    (t.playerIds[0] === m.t2[0] && t.playerIds[1] === m.t2[1]) ||
    (t.playerIds[0] === m.t2[1] && t.playerIds[1] === m.t2[0])
  ) : null;

  const p = [
    players.find(x => x.id === m.t1[0]),
    players.find(x => x.id === m.t1[1]),
    players.find(x => x.id === m.t2[0]),
    players.find(x => x.id === m.t2[1])
  ];

  const cName = customCourtNames[m.court] || `Court ${m.court}`;

  // Get available replacement players
  const currentPlayersInMatch = [...m.t1, ...m.t2].filter(id => id !== null);
  
  let currentStats = {};
  players.forEach(pl => { currentStats[pl.id] = { games: 0 }; });
  Object.values(matches).forEach(mx => {
    if (mx.score1 !== null && mx.score2 !== null) {
      mx.t1.forEach(id => { if (currentStats[id]) currentStats[id].games++; });
      mx.t2.forEach(id => { if (currentStats[id]) currentStats[id].games++; });
    }
  });

  const availablePlayersList = players.filter(pl => !pl.isWalkout && !currentPlayersInMatch.includes(pl.id));

  let availableEntities = [];

  (teams || []).forEach(t => {
    let p1 = players.find(pl => pl.id === t.playerIds[0]);
    let p2 = players.find(pl => pl.id === t.playerIds[1]);
    if (p1 && p2 && !p1.isWalkout && !p2.isWalkout) {
      if (!currentPlayersInMatch.includes(p1.id) && !currentPlayersInMatch.includes(p2.id)) {
        availableEntities.push({
          type: 'team',
          id: t.id,
          name: t.name,
          p1: p1.id,
          p2: p2.id,
          p1Name: p1.name,
          p2Name: p2.name,
          games: currentStats[p1.id] ? currentStats[p1.id].games : 0,
          assignedCourt: (p1.status === 'playing' && p1.court !== m.court) ? p1.court : 0,
          tier: p1.tier
        });
      }
    }
  });

  availablePlayersList.forEach(pl => {
    const isTeamMember = (teams || []).some(t => t.playerIds.includes(pl.id));
    if (!isTeamMember) {
      availableEntities.push({
        type: 'solo',
        id: pl.id,
        name: pl.name,
        games: currentStats[pl.id] ? currentStats[pl.id].games : 0,
        assignedCourt: (pl.status === 'playing' && pl.court !== m.court) ? pl.court : 0,
        tier: pl.tier
      });
    }
  });

  const tierVal = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
  availableEntities.sort((a, b) => {
    if (a.assignedCourt !== b.assignedCourt) return a.assignedCourt - b.assignedCourt;
    if (a.games !== b.games) return a.games - b.games;
    return (tierVal[a.tier] || 5) - (tierVal[b.tier] || 5);
  });

  const handleSwap = (entity) => {
    if (!selectedSlot) {
      toast.error("Pilih dulu slot pemain di lapangan atas yang mau diganti!");
      return;
    }
    executeSwap(matchKey, selectedSlot, entity);
    
    const slotStr = `${selectedSlot.team}-${selectedSlot.index}`;
    setLastSwappedSlot(slotStr);
    setSelectedSlot(null);
    setTimeout(() => {
      setLastSwappedSlot(null);
    }, 500);
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-800 border border-slate-600/80 rounded-3xl shadow-2xl max-w-2xl w-full p-5 md:p-6 relative flex flex-col max-h-[90vh]"
        >
          <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700/50 pb-3 flex items-center gap-2">
            Edit Court <span className="px-2 py-0.5 rounded shadow-sm border border-slate-600 bg-slate-900/50 text-[12px] align-middle font-mono text-slate-300">{cName}</span>
          </h3>
          
          <div className="bg-slate-900/60 rounded-2xl border border-slate-700/50 p-3 mb-4 flex relative items-center gap-8 md:gap-10 shadow-inner">
            <div className="w-1/2 flex flex-col gap-3 justify-center">
              {team1Obj ? (
                <SlotButton 
                  playerObj={null} 
                  team={1} 
                  index={0} 
                  teamObj={team1Obj} 
                  teamPlayers={[p[0], p[1]]}
                  matches={matches}
                  selectedSlot={selectedSlot}
                  lastSwappedSlot={lastSwappedSlot}
                  showMarking={showMarking}
                  onSelect={setSelectedSlot}
                />
              ) : (
                <>
                  <SlotButton 
                    playerObj={p[0]} 
                    team={1} 
                    index={0} 
                    matches={matches}
                    selectedSlot={selectedSlot}
                    lastSwappedSlot={lastSwappedSlot}
                    showMarking={showMarking}
                    onSelect={setSelectedSlot}
                  />
                  <SlotButton 
                    playerObj={p[1]} 
                    team={1} 
                    index={1} 
                    matches={matches}
                    selectedSlot={selectedSlot}
                    lastSwappedSlot={lastSwappedSlot}
                    showMarking={showMarking}
                    onSelect={setSelectedSlot}
                  />
                </>
              )}
            </div>
            
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-500 font-bold italic text-sm md:text-lg bg-slate-900 z-10 px-2 py-1 rounded-full border border-slate-800">VS</div>
            
            <div className="w-1/2 flex flex-col gap-3 justify-center">
              {team2Obj ? (
                <SlotButton 
                  playerObj={null} 
                  team={2} 
                  index={0} 
                  teamObj={team2Obj} 
                  teamPlayers={[p[2], p[3]]}
                  matches={matches}
                  selectedSlot={selectedSlot}
                  lastSwappedSlot={lastSwappedSlot}
                  showMarking={showMarking}
                  onSelect={setSelectedSlot}
                />
              ) : (
                <>
                  <SlotButton 
                    playerObj={p[2]} 
                    team={2} 
                    index={0} 
                    matches={matches}
                    selectedSlot={selectedSlot}
                    lastSwappedSlot={lastSwappedSlot}
                    showMarking={showMarking}
                    onSelect={setSelectedSlot}
                  />
                  <SlotButton 
                    playerObj={p[3]} 
                    team={2} 
                    index={1} 
                    matches={matches}
                    selectedSlot={selectedSlot}
                    lastSwappedSlot={lastSwappedSlot}
                    showMarking={showMarking}
                    onSelect={setSelectedSlot}
                  />
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-2 px-1">Pilih pemain / tim pengganti:</p>
          <div className="overflow-y-auto flex-grow bg-slate-900/40 p-2.5 rounded-2xl border border-slate-700/50 mb-4 hide-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {availableEntities.map(ent => {
                const isAssignedOtherCourt = ent.assignedCourt > 0;
                const cAssignedName = customCourtNames[ent.assignedCourt] || `L${ent.assignedCourt}`;
                
                return (
                  <button 
                    key={ent.id}
                    onClick={() => handleSwap(ent)} 
                    className={clsx(
                      "relative p-3 rounded-xl border flex flex-col items-center justify-center transition shadow-sm",
                      isAssignedOtherCourt ? "opacity-50 hover:opacity-100" : "opacity-100",
                      ent.type === 'team' ? "bg-indigo-900/40 border-indigo-700/50 hover:bg-indigo-800/60" : "border-slate-600/80 bg-slate-800/80 hover:bg-slate-700"
                    )}
                  >
                    {isAssignedOtherCourt && (
                      <div className="absolute -top-2 -right-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full shadow border border-slate-700 bg-slate-900 text-slate-300 font-bold">
                          {cAssignedName}
                        </span>
                      </div>
                    )}
                    <span className="font-bold text-white text-sm truncate w-full text-center mb-1.5">{ent.name}</span>
                    {ent.type === 'team' && (
                       <span className="text-[9px] text-slate-400 truncate w-full text-center mb-1.5">{ent.p1Name} & {ent.p2Name}</span>
                    )}
                    <div className="flex items-center gap-1.5 mt-auto">
                      {showMarking && ent.tier !== '-' && (
                        <span className={clsx("text-[9px] px-1.5 py-0.5 rounded font-mono border", getTierStyle(ent.tier))}>{ent.tier}</span>
                      )}
                      <span className="text-[10px] text-slate-300 font-bold font-mono bg-slate-900/80 px-2 py-0.5 rounded-md shadow-inner border border-slate-700/50">{ent.games}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex mt-auto shrink-0">
            <button 
              onClick={handleClose} 
              disabled={m.t1.includes(null) || m.t2.includes(null)}
              className="w-full bg-slate-700/80 hover:bg-slate-600 text-white font-bold py-3.5 rounded-xl transition shadow border border-slate-600 tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(m.t1.includes(null) || m.t2.includes(null)) ? "Pilih pemain untuk slot kosong" : "Selesai / Tutup"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
