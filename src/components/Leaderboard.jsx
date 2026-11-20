import { useTournamentStore } from '../store/useTournamentStore';
import { Flame, Medal } from 'lucide-react';
import clsx from 'clsx';

function getTierStyle(tier) {
  switch (tier) {
    case 'A': return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
    case 'B': return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
    case 'C': return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
    case 'D': return 'bg-rose-900/40 text-rose-300 border-rose-700/50';
    default: return 'bg-slate-800 text-slate-300 border-slate-600';
  }
}

function getCourtStyle(courtId) {
  const colors = ['bg-indigo-900/50 text-indigo-300 border-indigo-700/50', 'bg-fuchsia-900/50 text-fuchsia-300 border-fuchsia-700/50', 'bg-sky-900/50 text-sky-300 border-sky-700/50', 'bg-lime-900/50 text-lime-300 border-lime-700/50', 'bg-orange-900/50 text-orange-300 border-orange-700/50', 'bg-violet-900/50 text-violet-300 border-violet-700/50', 'bg-pink-900/50 text-pink-300 border-pink-700/50'];
  let idx = (parseInt(courtId) - 1) % colors.length;
  return isNaN(idx) ? colors[0] : colors[idx];
}

export default function Leaderboard() {
  const { currentView, getLeaderboardStats, config, customCourtNames, showBadges } = useTournamentStore();
  const { leaderboardItems } = getLeaderboardStats();

  const isSetup = currentView === 'setup';
  if (isSetup) return null;

  const winBonusCfg = config.bonus || 0;
  const restBonusCfg = config.restBonus || 0;
  const showMarking = config.type.includes('marked') && showBadges;

  return (
    <div className="w-full overflow-x-auto hide-scrollbar pb-20">
      <div className="w-full">
        <table className="w-full text-sm text-left border-collapse table-auto md:table-fixed">
          <thead className="text-[11px] text-slate-400 uppercase bg-slate-800 sticky top-0 z-20 border-b border-slate-700 shadow-sm">
            <tr>
              <th className="px-3 py-4 text-center whitespace-nowrap w-10">#</th>
              <th className="pl-2 pr-3 py-4 whitespace-nowrap w-full">Player</th>
              <th className="px-2 py-4 text-center whitespace-nowrap" title="Games Played">G</th>
              <th className="px-2 py-4 text-center whitespace-nowrap">W-L-T</th>
              <th className="px-2 py-4 text-center whitespace-nowrap uppercase">Diff</th>
              {(winBonusCfg > 0 || restBonusCfg > 0) && <th className="px-2 py-4 text-center whitespace-nowrap" title="Bonus Points">+M</th>}
              <th className="px-4 py-4 text-center whitespace-nowrap bg-slate-900/30">P</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardItems.map((item, index) => {
              const s = item.stats;
              const isPlaying = item.players.some(p => p.status === 'playing');
              const isInactive = item.isWalkout;
              const hasStreak = s.streak >= 3;
              const pCourt = item.players.find(p => p.status === 'playing')?.court;
              const cName = pCourt ? (customCourtNames[pCourt] || `L${pCourt}`) : null;

              let medal = null;
              if (index === 0 && !isInactive) medal = "text-yellow-400";
              if (index === 1 && !isInactive) medal = "text-slate-300";
              if (index === 2 && !isInactive) medal = "text-amber-600";

              return (
                <tr key={item.id} className={clsx("border-b border-slate-700 hover:bg-slate-800 transition", isInactive && "opacity-50")}>
                  <td className="px-3 py-4 text-center text-slate-500 font-bold text-xs w-10">
                    {medal ? <Medal className={`w-4 h-4 mx-auto ${medal}`} /> : index + 1}
                  </td>
                  <td className="pl-2 pr-3 py-4 flex flex-wrap items-center w-full">
                    {isInactive && <span className="bg-red-900/50 text-red-400 border border-red-700/50 text-[9px] px-1.5 py-0.5 rounded font-bold mr-2 tracking-wider shrink-0 mb-1">OFF</span>}
                    {!item.isTeam && showMarking && item.players[0].tier !== '-' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold mr-2 shrink-0 mb-1 ${getTierStyle(item.players[0].tier)}`}>
                        {item.players[0].tier}
                      </span>
                    )}
                    <div className={clsx("flex flex-col min-w-0 mr-1", isPlaying ? "font-bold text-white" : "text-slate-300 font-medium", isInactive && "line-through decoration-slate-500")}>
                      <span className="break-words">{item.name}</span>
                      {item.isTeam && (
                        <span className="text-[10px] text-slate-500 font-normal mt-0.5 break-words">
                          {item.players.map(p => p.name).join(' & ')}
                        </span>
                      )}
                    </div>
                    {hasStreak && !isInactive && <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse ml-1 shrink-0" />}
                    {isPlaying && !isInactive && cName && showBadges && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ml-1 shadow-sm border shrink-0 mt-1 md:mt-0 ${getCourtStyle(pCourt)}`}>
                        {cName}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-4 text-center text-slate-400 font-mono text-[13px]">{s.games}</td>
                  <td className="px-2 py-4 text-center text-slate-300 font-mono text-[13px] whitespace-nowrap">{s.wins}-{s.losses}-{s.ties}</td>
                  <td className={clsx("px-2 py-4 text-center font-mono text-[13px] font-bold", s.diff > 0 ? "text-green-400" : s.diff < 0 ? "text-red-400" : "text-slate-500")}>
                    {s.diff > 0 ? `+${s.diff}` : s.diff}
                  </td>
                  {(winBonusCfg > 0 || restBonusCfg > 0) && (
                    <td className="px-2 py-4 text-center text-blue-400/70 font-mono text-[12px]">
                      +{(s.wins * winBonusCfg) + (s.rests * restBonusCfg)}
                    </td>
                  )}
                  <td className="px-4 py-4 text-center font-bold text-emerald-400 font-mono text-[16px] bg-slate-900/30">
                    {s.totalPts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
