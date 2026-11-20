import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

let syncTimeout = null;

const draftCourtEntities = (entities) => {
  let resultIndices = [];
  
  const dfs = (index, currentSum, currentIndices) => {
    if (currentSum === 4) {
      resultIndices = [...currentIndices];
      return true;
    }
    if (currentSum > 4 || index >= entities.length) return false;
    
    currentIndices.push(index);
    if (dfs(index + 1, currentSum + entities[index].players.length, currentIndices)) return true;
    
    currentIndices.pop();
    if (dfs(index + 1, currentSum, currentIndices)) return true;
    
    return false;
  };
  
  if (dfs(0, 0, [])) {
    let selected = [];
    for (let i = resultIndices.length - 1; i >= 0; i--) {
      selected.unshift(entities[resultIndices[i]]);
      entities.splice(resultIndices[i], 1);
    }
    return selected;
  }
  return null;
};

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

export const useTournamentStore = create((set, get) => ({
  // Navigation & UI State
  currentView: 'setup', // 'setup', 'manager', 'config'
  viewMode: 'pager', // 'pager', 'list'
  activeRoundTab: 1,

  // Supabase State
  tournamentId: null,
  isHost: true,
  createdAt: null,
  lastModified: null,

  // Tournament Data
  config: {
    name: '',
    type: 'marked_mexicano',
    date: '',
    time: '',
    duration: 120,
    maxPoints: 21,
    sort: 'points',
    bonus: 0,
    restBonus: 0,
  },
  numCourts: 1,
  customCourtNames: {},
  players: [], // { id, name, tier, isWalkout, status, court }
  teams: [],
  matches: {}, // rX-cY: { round, court, t1: [], t2: [], score1, score2 }
  currentRound: 0,
  playerIdCounter: 1,
  isTournamentStarted: false,

  // --- ACTIONS: UI ---
  setView: (view) => set({ currentView: view }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveRoundTab: (tab) => set({ activeRoundTab: tab }),

  // --- ACTIONS: CONFIG & PLAYERS ---
  updateConfig: (updates) => {
    set((state) => ({ config: { ...state.config, ...updates } }));
    get().syncToSupabase();
  },
  setNumCourts: (num) => set({ numCourts: num }),
  setCustomCourtNames: (names) => set({ customCourtNames: names }),
  setPlayers: (players) => set({ players }),
  setPlayerIdCounter: (count) => set({ playerIdCounter: count }),

  // --- ACTIONS: ENGINES ---
  syncToSupabase: () => {
    const state = get();
    if (!state.tournamentId || !state.isHost) return;

    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
      const now = new Date().toISOString();
      set({ lastModified: now });
      const finalState = get();

      const payload = {
        config: finalState.config,
        numCourts: finalState.numCourts,
        customCourtNames: finalState.customCourtNames,
        players: finalState.players,
        teams: finalState.teams,
        matches: finalState.matches,
        currentRound: finalState.currentRound,
        playerIdCounter: finalState.playerIdCounter,
        isTournamentStarted: finalState.isTournamentStarted,
        createdAt: finalState.createdAt,
        lastModified: finalState.lastModified
      };
      
      try {
        await supabase
          .from('tournaments')
          .update({ state: payload })
          .eq('id', finalState.tournamentId);
      } catch (e) {
        console.error('Failed to sync', e);
      }
    }, 500);
  },

  loadFromSupabase: async (id, isHostUser) => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('state')
        .eq('id', id)
        .single();
      
      if (data && data.state) {
        set({
          tournamentId: id,
          isHost: isHostUser,
          config: data.state.config,
          numCourts: data.state.numCourts,
          customCourtNames: data.state.customCourtNames,
          players: data.state.players,
          teams: data.state.teams || [],
          matches: data.state.matches,
          currentRound: data.state.currentRound,
          playerIdCounter: data.state.playerIdCounter,
          isTournamentStarted: data.state.isTournamentStarted,
          createdAt: data.state.createdAt || null,
          lastModified: data.state.lastModified || null,
          currentView: 'manager'
        });

        if (isHostUser) {
          const historyItem = {
            id: id,
            name: data.state.config.name || 'Padel Tournament',
            createdAt: data.state.createdAt,
            playersCount: data.state.players.filter(p => !p.isWalkout).length,
            courtsCount: data.state.numCourts
          };
          let history = JSON.parse(localStorage.getItem('padel_history') || '[]');
          history = history.filter(h => h.id !== id);
          history.unshift(historyItem);
          localStorage.setItem('padel_history', JSON.stringify(history));
        }
        
        // Ensure activeRoundTab is valid
        const st = get();
        if (st.currentRound > 0) {
          set({ activeRoundTab: st.currentRound });
        }
      } else {
        console.error("Tournament not found", error);
      }
    } catch (e) {
      console.error('Failed to load from Supabase', e);
    }
  },

  startTournament: async (parsedPlayers, newNumCourts, newConfig, newCourtNames, teams) => {
    const state = get();
    let newPlayerId = state.playerIdCounter;
    let newPlayersArray = [];

    let tempToRealId = {};

    parsedPlayers.forEach((data) => {
      if (data.pid) {
        let p = state.players.find((x) => x.id === data.pid);
        if (p) {
          p.name = data.name;
          p.tier = data.tier;
          p.isWalkout = data.isInactive;
          if (p.isWalkout) {
            p.status = 'rest';
            p.court = null;
          }
          newPlayersArray.push({ ...p });
          tempToRealId[data.tempId] = p.id;
        }
      } else {
        let p = state.players.find((x) => x.name.toLowerCase() === data.name.toLowerCase());
        if (p) {
          p.tier = data.tier;
          p.isWalkout = data.isInactive;
          if (p.isWalkout) {
            p.status = 'rest';
            p.court = null;
          }
          newPlayersArray.push({ ...p });
          tempToRealId[data.tempId] = p.id;
        } else {
          newPlayersArray.push({
            id: newPlayerId,
            name: data.name,
            tier: data.tier,
            status: 'rest',
            court: null,
            isWalkout: data.isInactive,
          });
          tempToRealId[data.tempId] = newPlayerId;
          newPlayerId++;
        }
      }
    });

    if (state.isTournamentStarted) {
      state.players.forEach((oldP) => {
        if (!newPlayersArray.find((nP) => nP.id === oldP.id)) {
          newPlayersArray.push({ ...oldP, isWalkout: true, status: 'rest', court: null });
        }
      });
    }

    let nextMatches = { ...state.matches };
    if (state.currentRound > 0) {
      Object.keys(nextMatches).forEach((key) => {
        if (nextMatches[key].round === state.currentRound) {
          let m = { ...nextMatches[key] };
          m.t1 = m.t1.map((id) => (newPlayersArray.find((p) => p.id === id)?.isWalkout ? null : id));
          m.t2 = m.t2.map((id) => (newPlayersArray.find((p) => p.id === id)?.isWalkout ? null : id));
          nextMatches[key] = m;
        }
      });
    }

    let realTeams = (teams || []).map(t => ({
       id: t.id,
       name: t.name,
       playerIds: [ tempToRealId[t.playerIds[0]], tempToRealId[t.playerIds[1]] ]
    })).filter(t => t.playerIds[0] !== undefined && t.playerIds[1] !== undefined);

    set({
      config: { ...state.config, ...newConfig },
      numCourts: newNumCourts,
      customCourtNames: newCourtNames,
      players: newPlayersArray,
      teams: realTeams,
      playerIdCounter: newPlayerId,
      matches: nextMatches,
      currentView: 'manager',
    });

    const updatedState = get();

    if (!updatedState.isTournamentStarted) {
      set({ isTournamentStarted: true });
      updatedState.generateNextRound();
    }

    const finalState = get();
    const now = new Date().toISOString();
    
    set({ createdAt: now, lastModified: now });
    const stateWithDates = get();

    const payload = {
      config: stateWithDates.config,
      numCourts: stateWithDates.numCourts,
      customCourtNames: stateWithDates.customCourtNames,
      players: stateWithDates.players,
      teams: stateWithDates.teams,
      matches: stateWithDates.matches,
      currentRound: stateWithDates.currentRound,
      playerIdCounter: stateWithDates.playerIdCounter,
      isTournamentStarted: stateWithDates.isTournamentStarted,
      createdAt: stateWithDates.createdAt,
      lastModified: stateWithDates.lastModified
    };

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert([{ state: payload }])
        .select('id');

        window.localStorage.setItem('padel_host_' + data[0].id, 'true');
        window.history.replaceState({}, '', `?id=${data[0].id}`);
        set({ tournamentId: data[0].id, isHost: true });
        
        let hostTourneys = JSON.parse(localStorage.getItem('host_tournaments') || '[]');
        if (!hostTourneys.includes(data[0].id)) {
          hostTourneys.push(data[0].id);
          localStorage.setItem('host_tournaments', JSON.stringify(hostTourneys));
        }

        const historyItem = {
          id: data[0].id,
          name: stateWithDates.config.name || 'Padel Tournament',
          createdAt: stateWithDates.createdAt,
          playersCount: stateWithDates.players.filter(p => !p.isWalkout).length,
          courtsCount: stateWithDates.numCourts
        };
        let history = JSON.parse(localStorage.getItem('padel_history') || '[]');
        history = history.filter(h => h.id !== data[0].id);
        history.unshift(historyItem);
        localStorage.setItem('padel_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to create tournament', e);
    }
  },

  draftCourts: (availablePlayers, currentStats, courtsToDraft, teams) => {
    const state = get();
    let sortedForDraft = [...availablePlayers].sort((a, b) => {
      let sA = currentStats[a.id], sB = currentStats[b.id];
      if (sA.games !== sB.games) return sA.games - sB.games;
      if (sB.points !== sA.points) return sB.points - sA.points;
      if (sB.wins !== sA.wins) return sB.wins - sA.wins;
      return sB.diff - sA.diff;
    });

    let entities = [];
    let handledPlayers = new Set();
    
    (teams || []).forEach(t => {
       let p1 = sortedForDraft.find(p => p.id === t.playerIds[0]);
       let p2 = sortedForDraft.find(p => p.id === t.playerIds[1]);
       if (p1 && p2) {
          entities.push({
             isTeam: true,
             teamId: t.id,
             players: [p1, p2],
             rank: sortedForDraft.indexOf(p1) + sortedForDraft.indexOf(p2)
          });
          handledPlayers.add(p1.id);
          handledPlayers.add(p2.id);
       }
    });

    sortedForDraft.forEach(p => {
       if (!handledPlayers.has(p.id)) {
          entities.push({
             isTeam: false,
             players: [p],
             rank: sortedForDraft.indexOf(p)
          });
       }
    });

    entities.sort((a, b) => a.rank - b.rank);

    let draftedCourts = [];
    for (let c = 0; c < courtsToDraft; c++) {
        let selected = draftCourtEntities(entities);
        if (!selected) break;

        let courtPlayers = { t1: [], t2: [] };
        if (selected.length === 2) {
            courtPlayers.t1 = selected[0].players.map(p => p.id);
            courtPlayers.t2 = selected[1].players.map(p => p.id);
        } else if (selected.length === 3) {
            let team = selected.find(e => e.isTeam);
            let solos = selected.filter(e => !e.isTeam);
            courtPlayers.t1 = team.players.map(p => p.id);
            courtPlayers.t2 = [solos[0].players[0].id, solos[1].players[0].id];
        } else if (selected.length === 4) {
            let solos = selected.map(e => e.players[0]);
            if (state.config.type.includes('marked')) {
               const tierVal = { A: 4, B: 3, C: 2, D: 1 };
               solos.sort((a, b) => (tierVal[b.tier] || 0) - (tierVal[a.tier] || 0));
            } else {
               solos.sort((a, b) => currentStats[b.id].points - currentStats[a.id].points);
            }
            courtPlayers.t1 = [solos[0].id, solos[2].id];
            courtPlayers.t2 = [solos[1].id, solos[3].id];
        }
        draftedCourts.push(courtPlayers);
    }
    return draftedCourts;
  },

  generateNextRound: () => {
    const state = get();
    const nextRound = state.currentRound + 1;
    
    let updatedPlayers = state.players.map((p) => {
      if (!p.isWalkout) return { ...p, status: 'rest', court: null };
      return p;
    });

    let availablePlayers = updatedPlayers.filter((p) => !p.isWalkout);
    const { stats } = state.getLeaderboardStats();

    let draftedCourts = get().draftCourts(availablePlayers, stats, state.numCourts, state.teams);
    let nextMatches = { ...state.matches };

    for (let i = 0; i < draftedCourts.length; i++) {
      let courtId = i + 1;
      let cMatch = draftedCourts[i];

      let matchKey = `r${nextRound}-c${courtId}`;
      nextMatches[matchKey] = {
        round: nextRound,
        court: courtId,
        t1: cMatch.t1,
        t2: cMatch.t2,
        score1: null,
        score2: null,
        timestamp: Date.now()
      };

      [...cMatch.t1, ...cMatch.t2].forEach((id) => {
        let pIndex = updatedPlayers.findIndex((p) => p.id === id);
        if (pIndex !== -1) {
          updatedPlayers[pIndex].status = 'playing';
          updatedPlayers[pIndex].court = courtId;
        }
      });
    }

    set({
      currentRound: nextRound,
      players: updatedPlayers,
      matches: nextMatches,
      activeRoundTab: nextRound,
    });
    get().syncToSupabase();
  },

  setScore: (matchKey, scoreVal, teamIndex) => {
    const state = get();
    const match = state.matches[matchKey];
    if (!match) return;

    let newMatch = { ...match };
    if (scoreVal === null) {
      newMatch.score1 = null;
      newMatch.score2 = null;
    } else {
      if (teamIndex === 1) {
        newMatch.score1 = scoreVal;
        newMatch.score2 = state.config.maxPoints - scoreVal;
      } else {
        newMatch.score2 = scoreVal;
        newMatch.score1 = state.config.maxPoints - scoreVal;
      }
    }

    set({ matches: { ...state.matches, [matchKey]: newMatch } });
    get().syncToSupabase();

    // Auto-advance is disabled. Users must click Generate Next Round manually.
  },

  generateMatchForCourt: (courtId) => {
    const state = get();
    let updatedPlayers = [...state.players];
    
    updatedPlayers.forEach(p => {
       if (p.court === courtId) {
          p.status = 'rest';
          p.court = null;
       }
    });

    let availablePlayers = updatedPlayers.filter(p => !p.isWalkout && p.status === 'rest');
    if (availablePlayers.length < 4) return;

    const { stats } = state.getLeaderboardStats();
    let draftedCourts = get().draftCourts(availablePlayers, stats, 1, state.teams);

    if (draftedCourts.length === 0) return;

    let cMatch = draftedCourts[0];
    let nextMatches = { ...state.matches };
    let courtMatches = Object.values(state.matches).filter(m => m.court === courtId);
    let nextRound = courtMatches.length + 1;
    let matchId = `r${nextRound}-c${courtId}`; 

    nextMatches[matchId] = {
      round: nextRound,
      court: courtId,
      t1: cMatch.t1,
      t2: cMatch.t2,
      score1: null,
      score2: null,
      timestamp: Date.now()
    };

    [...cMatch.t1, ...cMatch.t2].forEach(id => {
      let pIndex = updatedPlayers.findIndex(p => p.id === id);
      if (pIndex !== -1) {
        updatedPlayers[pIndex].status = 'playing';
        updatedPlayers[pIndex].court = courtId;
      }
    });

    let newCurrentRound = Math.max(state.currentRound, nextRound);

    set({ players: updatedPlayers, matches: nextMatches, currentRound: newCurrentRound });
    get().syncToSupabase();
  },

  triggerNextRound: () => {
    const state = get();
    let latestMatches = {};
    for (let i = 1; i <= state.numCourts; i++) {
       let courtMatches = Object.values(state.matches).filter(m => m.court === i);
       if (courtMatches.length > 0) {
          latestMatches[i] = courtMatches.reduce((max, m) => m.round > max.round ? m : max, courtMatches[0]);
       }
    }

    let readyCourts = [];
    let allReady = true;
    for (let i = 1; i <= state.numCourts; i++) {
       let lm = latestMatches[i];
       if (lm && lm.score1 !== null && lm.score2 !== null) {
          readyCourts.push(i);
       } else {
          allReady = false;
       }
    }

    if (readyCourts.length === 0) return;

    if (allReady) {
       let rounds = Object.values(latestMatches).map(m => m.round);
       let sameRound = rounds.every(r => r === rounds[0]);
       if (sameRound) {
          get().generateNextRound();
       } else {
          readyCourts.forEach(c => get().generateMatchForCourt(c));
       }
    } else {
       readyCourts.forEach(c => get().generateMatchForCourt(c));
    }
  },

  executeSwap: (matchKey, selectedSlot, newEntity) => {
    const state = get();
    let nextMatches = { ...state.matches };
    let m = { ...nextMatches[matchKey] };

    let pIds = newEntity.type === 'team' ? [newEntity.p1, newEntity.p2] : [newEntity.id];

    // Remove these players from any active match
    Object.keys(nextMatches).forEach((k) => {
      let rm = { ...nextMatches[k] };
      if (rm.score1 === null || rm.score2 === null) {
        let changed = false;
        pIds.forEach(pid => {
          if (rm.t1.includes(pid)) {
            rm.t1 = rm.t1.map((id) => (id === pid ? null : id));
            changed = true;
          }
          if (rm.t2.includes(pid)) {
            rm.t2 = rm.t2.map((id) => (id === pid ? null : id));
            changed = true;
          }
        });
        if (changed) nextMatches[k] = rm;
      }
    });

    let targetSide = selectedSlot.team === 1 ? m.t1 : m.t2;
    let existingP1 = targetSide[0];
    let existingP2 = targetSide[1];
    
    let isOccupiedByTeam = false;
    if (existingP1 !== null && existingP2 !== null) {
       isOccupiedByTeam = (state.teams || []).some(t => 
         (t.playerIds[0] === existingP1 && t.playerIds[1] === existingP2) ||
         (t.playerIds[0] === existingP2 && t.playerIds[1] === existingP1)
       );
    }

    if (newEntity.type === 'team') {
       targetSide = [newEntity.p1, newEntity.p2];
    } else {
       if (isOccupiedByTeam) {
          targetSide = targetSide.map((_, idx) => idx === selectedSlot.index ? newEntity.id : null);
       } else {
          targetSide = [...targetSide];
          targetSide[selectedSlot.index] = newEntity.id;
       }
    }

    if (selectedSlot.team === 1) m.t1 = targetSide;
    else m.t2 = targetSide;
    
    nextMatches[matchKey] = m;

    // Recalculate player statuses
    let nextPlayers = state.players.map((p) => {
      if (!p.isWalkout) return { ...p, status: 'rest', court: null };
      return p;
    });

    Object.values(nextMatches).forEach((rm) => {
      if (rm.score1 === null || rm.score2 === null) {
        [...rm.t1, ...rm.t2].forEach((id) => {
          if (id !== null) {
            let pIndex = nextPlayers.findIndex((x) => x.id === id);
            if (pIndex !== -1) {
              nextPlayers[pIndex].status = 'playing';
              nextPlayers[pIndex].court = rm.court;
            }
          }
        });
      }
    });

    set({ matches: nextMatches, players: nextPlayers });
    get().syncToSupabase();
  },

  getLeaderboardStats: () => {
    const state = get();
    let stats = {};
    state.players.forEach((p) => {
      stats[p.id] = { games: 0, wins: 0, losses: 0, ties: 0, points: 0, diff: 0, rests: 0, streak: 0 };
    });

    // To calculate streak, we need matches ordered by round
    const sortedMatches = Object.values(state.matches)
      .filter((m) => m.score1 !== null && m.score2 !== null)
      .sort((a, b) => a.round - b.round);

    sortedMatches.forEach((m) => {
      m.t1.forEach((id) => {
        if (stats[id]) {
          stats[id].games++;
          stats[id].points += m.score1;
          stats[id].diff += m.score1 - m.score2;
          if (m.score1 > m.score2) {
            stats[id].wins++;
            stats[id].streak++;
          } else if (m.score1 < m.score2) {
            stats[id].losses++;
            stats[id].streak = 0;
          } else {
            stats[id].ties++;
            stats[id].streak = 0;
          }
        }
      });
      m.t2.forEach((id) => {
        if (stats[id]) {
          stats[id].games++;
          stats[id].points += m.score2;
          stats[id].diff += m.score2 - m.score1;
          if (m.score2 > m.score1) {
            stats[id].wins++;
            stats[id].streak++;
          } else if (m.score2 < m.score1) {
            stats[id].losses++;
            stats[id].streak = 0;
          } else {
            stats[id].ties++;
            stats[id].streak = 0;
          }
        }
      });
    });

    state.players.forEach((p) => {
      if (!p.isWalkout && state.currentRound > 0) {
        stats[p.id].rests = Math.max(0, state.currentRound - stats[p.id].games);
      } else {
        stats[p.id].rests = 0;
      }
      
      let s = stats[p.id];
      s.totalPts = s.points + s.wins * state.config.bonus + s.rests * state.config.restBonus;
    });

    let leaderboardItems = [];
    let handledPlayers = new Set();
    
    (state.teams || []).forEach(t => {
       let p1 = state.players.find(p => p.id === t.playerIds[0]);
       let p2 = state.players.find(p => p.id === t.playerIds[1]);
       if (p1 && p2) {
          leaderboardItems.push({
             isTeam: true,
             id: t.id,
             name: t.name,
             stats: stats[p1.id],
             players: [p1, p2],
             sortVal: stats[p1.id].totalPts,
             isWalkout: p1.isWalkout || p2.isWalkout
          });
          handledPlayers.add(p1.id);
          handledPlayers.add(p2.id);
       }
    });

    state.players.forEach(p => {
       if (!handledPlayers.has(p.id)) {
          leaderboardItems.push({
             isTeam: false,
             id: p.id,
             name: p.name,
             tier: p.tier,
             isWalkout: p.isWalkout,
             stats: stats[p.id],
             players: [p],
             sortVal: stats[p.id].totalPts
          });
       }
    });

    leaderboardItems.sort((a, b) => {
      if (a.isWalkout && !b.isWalkout) return 1;
      if (!a.isWalkout && b.isWalkout) return -1;

      let sA = a.stats, sB = b.stats;
      if (state.config.sort === 'points') {
        if (sB.totalPts !== sA.totalPts) return sB.totalPts - sA.totalPts;
        if (sB.wins !== sA.wins) return sB.wins - sA.wins;
        return sB.diff - sA.diff;
      } else {
        if (sB.wins !== sA.wins) return sB.wins - sA.wins;
        if (sB.totalPts !== sA.totalPts) return sB.totalPts - sA.totalPts;
        return sB.diff - sA.diff;
      }
    });

    let sortedPlayers = [...state.players].sort((a, b) => {
      if (a.isWalkout && !b.isWalkout) return 1;
      if (!a.isWalkout && b.isWalkout) return -1;

      let sA = stats[a.id], sB = stats[b.id];
      if (state.config.sort === 'points') {
        if (sB.totalPts !== sA.totalPts) return sB.totalPts - sA.totalPts;
        if (sB.wins !== sA.wins) return sB.wins - sA.wins;
        return sB.diff - sA.diff;
      } else {
        if (sB.wins !== sA.wins) return sB.wins - sA.wins;
        if (sB.totalPts !== sA.totalPts) return sB.totalPts - sA.totalPts;
        return sB.diff - sA.diff;
      }
    });

    return { sortedPlayers, stats, leaderboardItems };
  },

  getBalanceText: () => {
    const state = get();
    let activeCount = state.players.filter((p) => !p.isWalkout).length;
    if (activeCount === 0 || state.numCourts === 0) return '-';
    let slots = state.numCourts * 4;
    let cycle = activeCount / gcd(activeCount, slots);
    if (!Number.isInteger(cycle)) cycle = Math.ceil(cycle);

    let rem = cycle - (state.currentRound % cycle);
    if (rem === cycle && state.currentRound > 0) return '0 - WELL BALANCE';
    return rem.toString();
  },

}));
