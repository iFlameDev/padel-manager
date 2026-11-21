import { create } from 'zustand';

let saveTimeout = null;

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
  showBadges: true, // Toggle visibility of Tier & Court badges

  // Tournament Identity (Offline)
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
  toggleBadges: () => set((state) => ({ showBadges: !state.showBadges })),

  // --- ACTIONS: CONFIG & PLAYERS ---
  updateConfig: (updates) => {
    set((state) => ({ config: { ...state.config, ...updates } }));
    get().saveToHistory();
  },
  setNumCourts: (num) => set({ numCourts: num }),
  setCustomCourtNames: (names) => set({ customCourtNames: names }),
  setPlayers: (players) => set({ players }),
  setPlayerIdCounter: (count) => set({ playerIdCounter: count }),

  // --- ACTIONS: STORAGE (LOCAL HISTORY / OFFLINE) ---
  saveToHistory: () => {
    const state = get();
    if (!state.tournamentId) return;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
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
        createdAt: finalState.createdAt || now,
        lastModified: now
      };

      const historyItem = {
        id: finalState.tournamentId,
        name: finalState.config.name || 'Padel Tournament',
        createdAt: finalState.createdAt || now,
        lastModified: now,
        playersCount: finalState.players.filter((p) => !p.isWalkout).length,
        courtsCount: finalState.numCourts,
        state: payload
      };

      try {
        let history = JSON.parse(localStorage.getItem('padel_history') || '[]');
        const idx = history.findIndex((h) => h.id === finalState.tournamentId);
        if (idx !== -1) {
          history[idx] = historyItem;
        } else {
          history.unshift(historyItem);
        }
        localStorage.setItem('padel_history', JSON.stringify(history));
      } catch (e) {
        console.error('Failed to save to local history', e);
      }
    }, 200);
  },

  loadFromHistory: (id) => {
    try {
      const history = JSON.parse(localStorage.getItem('padel_history') || '[]');
      const item = history.find((h) => h.id === id);
      if (item && item.state) {
        set({
          tournamentId: id,
          isHost: true,
          config: item.state.config,
          numCourts: item.state.numCourts,
          customCourtNames: item.state.customCourtNames || {},
          players: item.state.players || [],
          teams: item.state.teams || [],
          matches: item.state.matches || {},
          currentRound: item.state.currentRound || 0,
          playerIdCounter: item.state.playerIdCounter || 1,
          isTournamentStarted: item.state.isTournamentStarted ?? true,
          createdAt: item.state.createdAt || item.createdAt || null,
          lastModified: item.state.lastModified || item.lastModified || null,
          currentView: 'manager'
        });

        const st = get();
        if (st.currentRound > 0) {
          set({ activeRoundTab: st.currentRound });
        }
        window.history.replaceState({}, '', `?id=${id}`);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to load from history', e);
      return false;
    }
  },

  deleteTournament: (id) => {
    try {
      let history = JSON.parse(localStorage.getItem('padel_history') || '[]');
      history = history.filter((h) => h.id !== id);
      localStorage.setItem('padel_history', JSON.stringify(history));

      const st = get();
      if (st.tournamentId === id) {
        get().resetTournament();
      }
    } catch (e) {
      console.error('Failed to delete tournament', e);
    }
  },

  resetTournament: () => {
    set({
      currentView: 'setup',
      tournamentId: null,
      isHost: true,
      createdAt: null,
      lastModified: null,
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
      players: [],
      teams: [],
      matches: {},
      currentRound: 0,
      playerIdCounter: 1,
      isTournamentStarted: false,
      activeRoundTab: 1
    });
    window.history.replaceState({}, '', window.location.pathname);
  },

  // --- ACTIONS: ENGINES ---
  startTournament: (parsedPlayers, newNumCourts, newConfig, newCourtNames, teams) => {
    const state = get();
    let newPlayerId = state.playerIdCounter;
    let newPlayersArray = [];
    let tempToRealId = {};

    parsedPlayers.forEach((data) => {
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
    });

    let realTeams = (teams || []).map((t) => ({
      id: t.id,
      name: t.name,
      playerIds: [tempToRealId[t.playerIds[0]], tempToRealId[t.playerIds[1]]]
    })).filter((t) => t.playerIds[0] !== undefined && t.playerIds[1] !== undefined);

    const tourneyId = 't_' + Date.now();
    const now = new Date().toISOString();

    set({
      tournamentId: tourneyId,
      isHost: true,
      createdAt: now,
      lastModified: now,
      config: { ...state.config, ...newConfig },
      numCourts: newNumCourts,
      customCourtNames: newCourtNames,
      players: newPlayersArray,
      teams: realTeams,
      playerIdCounter: newPlayerId,
      matches: {},
      currentRound: 0,
      isTournamentStarted: true,
      currentView: 'manager'
    });

    get().generateNextRound();
    get().saveToHistory();
    window.history.replaceState({}, '', `?id=${tourneyId}`);
  },

  saveConfigChanges: (parsedPlayers, newNumCourts, newConfig, newCourtNames, teams) => {
    const state = get();
    let newPlayerId = state.playerIdCounter;
    let newPlayersArray = [];
    let tempToRealId = {};

    parsedPlayers.forEach((data) => {
      if (data.pid) {
        let p = state.players.find((x) => x.id === data.pid);
        if (p) {
          newPlayersArray.push({
            ...p,
            name: data.name,
            tier: data.tier,
            isWalkout: data.isInactive,
            status: data.isInactive ? 'rest' : p.status,
            court: data.isInactive ? null : p.court
          });
          tempToRealId[data.tempId] = p.id;
        }
      } else {
        let p = state.players.find((x) => x.name.toLowerCase() === data.name.toLowerCase());
        if (p) {
          newPlayersArray.push({
            ...p,
            tier: data.tier,
            isWalkout: data.isInactive,
            status: data.isInactive ? 'rest' : p.status,
            court: data.isInactive ? null : p.court
          });
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

    state.players.forEach((oldP) => {
      if (!newPlayersArray.find((nP) => nP.id === oldP.id)) {
        newPlayersArray.push({ ...oldP, isWalkout: true, status: 'rest', court: null });
      }
    });

    const playersById = new Map(newPlayersArray.map((player) => [player.id, player]));
    const nextMatches = Object.fromEntries(
      Object.entries(state.matches).map(([key, match]) => {
        if (match.score1 !== null && match.score2 !== null) return [key, match];

        const keepAvailablePlayers = (playerIds) => playerIds.map((id) => (
          id !== null && playersById.get(id)?.isWalkout ? null : id
        ));

        return [key, {
          ...match,
          t1: keepAvailablePlayers(match.t1),
          t2: keepAvailablePlayers(match.t2)
        }];
      })
    );

    newPlayersArray.forEach((player) => {
      if (!player.isWalkout) {
        player.status = 'rest';
        player.court = null;
      }
    });
    Object.values(nextMatches).forEach((match) => {
      if (match.score1 !== null && match.score2 !== null) return;
      [...match.t1, ...match.t2].forEach((id) => {
        const player = playersById.get(id);
        if (player && !player.isWalkout) {
          player.status = 'playing';
          player.court = match.court;
        }
      });
    });

    let realTeams = (teams || []).map((t) => ({
      id: t.id,
      name: t.name,
      playerIds: [
        tempToRealId[t.playerIds[0]] ?? t.playerIds[0],
        tempToRealId[t.playerIds[1]] ?? t.playerIds[1]
      ]
    })).filter((t) => t.playerIds[0] !== undefined && t.playerIds[1] !== undefined);

    set({
      config: { ...state.config, ...newConfig },
      numCourts: newNumCourts,
      customCourtNames: newCourtNames,
      players: newPlayersArray,
      teams: realTeams,
      playerIdCounter: newPlayerId,
      matches: nextMatches,
      currentView: 'manager'
    });

    get().generateMissingMatchesAtLatestRound();
    get().saveToHistory();
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
    
    (teams || []).forEach((t) => {
      let p1 = sortedForDraft.find((p) => p.id === t.playerIds[0]);
      let p2 = sortedForDraft.find((p) => p.id === t.playerIds[1]);
      if (p1 && p2) {
        entities.push({
          isTeam: true,
          teamId: t.id,
          players: [p1, p2],
          rank: (sortedForDraft.indexOf(p1) + sortedForDraft.indexOf(p2)) / 2
        });
        handledPlayers.add(p1.id);
        handledPlayers.add(p2.id);
      }
    });

    sortedForDraft.forEach((p) => {
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
        courtPlayers.t1 = selected[0].players.map((p) => p.id);
        courtPlayers.t2 = selected[1].players.map((p) => p.id);
      } else if (selected.length === 3) {
        let team = selected.find((e) => e.isTeam);
        let solos = selected.filter((e) => !e.isTeam);
        courtPlayers.t1 = team.players.map((p) => p.id);
        courtPlayers.t2 = [solos[0].players[0].id, solos[1].players[0].id];
      } else if (selected.length === 4) {
        let solos = selected.map((e) => e.players[0]);
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
    get().saveToHistory();
  },

  setScore: (matchKey, scoreVal, teamIndex) => {
    const state = get();
    const match = state.matches[matchKey];
    if (!match) return;
    if (
      scoreVal !== null &&
      (match.score1 === null || match.score2 === null) &&
      [...match.t1, ...match.t2].some((id) => (
        id === null || !state.players.some((player) => player.id === id && !player.isWalkout)
      ))
    ) return;

    const maxPts = Number.isInteger(state.config.maxPoints) && state.config.maxPoints > 0 ? state.config.maxPoints : 21;

    let newMatch = { ...match };
    if (scoreVal === null) {
      newMatch.score1 = null;
      newMatch.score2 = null;
    } else {
      if (teamIndex === 1) {
        newMatch.score1 = scoreVal;
        newMatch.score2 = maxPts - scoreVal;
      } else {
        newMatch.score2 = scoreVal;
        newMatch.score1 = maxPts - scoreVal;
      }
    }

    set({ matches: { ...state.matches, [matchKey]: newMatch } });
    get().generateMissingMatchesAtLatestRound();
    get().saveToHistory();
  },

  generateMatchForCourt: (courtId) => {
    const state = get();
    const courtMatches = Object.values(state.matches).filter((match) => match.court === courtId);
    if (courtMatches.some((match) => match.score1 === null || match.score2 === null)) return;

    const latestRound = Math.max(
      state.currentRound,
      ...Object.values(state.matches).map((match) => match.round),
      0
    );
    const latestCourtMatch = courtMatches.reduce(
      (latest, match) => !latest || match.round > latest.round ? match : latest,
      null
    );
    const nextRound = latestCourtMatch
      ? Math.max(latestRound, latestCourtMatch.round + 1)
      : Math.max(1, latestRound);
    const matchId = `r${nextRound}-c${courtId}`;
    if (state.matches[matchId]) return;

    const busyPlayerIds = new Set(
      Object.values(state.matches)
        .filter((match) => match.score1 === null || match.score2 === null)
        .flatMap((match) => [...match.t1, ...match.t2])
        .filter((id) => id !== null)
    );
    const availablePlayers = state.players.filter((player) => (
      !player.isWalkout && !busyPlayerIds.has(player.id)
    ));
    if (availablePlayers.length < 4) return;

    const { stats } = state.getLeaderboardStats();
    let draftedCourts = get().draftCourts(availablePlayers, stats, 1, state.teams);

    if (draftedCourts.length === 0) return;

    let cMatch = draftedCourts[0];
    const nextMatches = {
      ...state.matches,
      [matchId]: {
        round: nextRound,
        court: courtId,
        t1: cMatch.t1,
        t2: cMatch.t2,
        score1: null,
        score2: null,
        timestamp: Date.now()
      }
    };

    const assignedPlayerIds = new Set([...cMatch.t1, ...cMatch.t2]);
    const updatedPlayers = state.players.map((player) => (
      assignedPlayerIds.has(player.id)
        ? { ...player, status: 'playing', court: courtId }
        : player
    ));

    const newCurrentRound = Math.max(state.currentRound, nextRound);

    set({ players: updatedPlayers, matches: nextMatches, currentRound: newCurrentRound });
    get().generateMissingMatchesAtLatestRound();
    get().saveToHistory();
  },

  generateMissingMatchesAtLatestRound: () => {
    let state = get();
    const latestRound = Math.max(
      state.currentRound,
      ...Object.values(state.matches).map((match) => match.round),
      0
    );
    if (latestRound === 0) return;

    let matchesChanged = false;
    const nextMatches = { ...state.matches };
    const nextPlayers = [...state.players];

    for (let courtId = 1; courtId <= state.numCourts; courtId++) {
      const matchKey = `r${latestRound}-c${courtId}`;
      if (nextMatches[matchKey]) continue;

      const courtHasUnfinishedMatch = Object.values(nextMatches).some((match) => (
        match.court === courtId && (match.score1 === null || match.score2 === null)
      ));
      if (courtHasUnfinishedMatch) continue;

      const busyPlayerIds = new Set(
        Object.values(nextMatches)
          .filter((match) => match.score1 === null || match.score2 === null)
          .flatMap((match) => [...match.t1, ...match.t2])
          .filter((id) => id !== null)
      );
      const availablePlayers = nextPlayers.filter((player) => (
        !player.isWalkout && !busyPlayerIds.has(player.id)
      ));
      if (availablePlayers.length < 4) continue;

      const { stats } = get().getLeaderboardStats();
      const draftedCourts = get().draftCourts(availablePlayers, stats, 1, state.teams);
      if (draftedCourts.length === 0) continue;

      const draftedMatch = draftedCourts[0];
      nextMatches[matchKey] = {
        round: latestRound,
        court: courtId,
        t1: draftedMatch.t1,
        t2: draftedMatch.t2,
        score1: null,
        score2: null,
        timestamp: Date.now()
      };
      const assignedPlayerIds = new Set([...draftedMatch.t1, ...draftedMatch.t2]);
      for (let index = 0; index < nextPlayers.length; index++) {
        if (assignedPlayerIds.has(nextPlayers[index].id)) {
          nextPlayers[index] = {
            ...nextPlayers[index],
            status: 'playing',
            court: courtId
          };
        }
      }
      matchesChanged = true;
      state = {
        ...state,
        matches: nextMatches,
        players: nextPlayers
      };
    }

    if (!matchesChanged) return;
    set({ matches: nextMatches, players: nextPlayers });
    get().saveToHistory();
  },

  triggerNextRound: () => {
    const state = get();
    const latestMatches = {};
    Object.values(state.matches).forEach((match) => {
      const current = latestMatches[match.court];
      if (!current || match.round > current.round) latestMatches[match.court] = match;
    });

    const activeCourts = Object.keys(latestMatches)
      .map(Number)
      .filter((court) => court <= state.numCourts);
    const readyCourts = activeCourts.filter((court) => {
      const match = latestMatches[court];
      return match.score1 !== null && match.score2 !== null;
    });
    const hasUnfinishedRemovedCourt = Object.entries(latestMatches).some(([court, match]) => (
      Number(court) > state.numCourts && (match.score1 === null || match.score2 === null)
    ));
    const allReady = !hasUnfinishedRemovedCourt && activeCourts.every((court) => {
      const match = latestMatches[court];
      return match.score1 !== null && match.score2 !== null;
    });

    if (readyCourts.length === 0) return;

    if (allReady) {
      let rounds = activeCourts.map((court) => latestMatches[court].round);
      let sameRound = rounds.every((r) => r === rounds[0]);
      if (sameRound) {
        get().generateNextRound();
      } else {
        readyCourts.forEach((c) => get().generateMatchForCourt(c));
      }
    } else {
      readyCourts.forEach((c) => get().generateMatchForCourt(c));
    }
  },

  swapMatchSlots: (matchKey, firstSlot, secondSlot) => {
    const state = get();
    const match = state.matches[matchKey];
    if (!match || (match.score1 !== null && match.score2 !== null)) return false;
    if (firstSlot.team === secondSlot.team && firstSlot.index === secondSlot.index) return false;

    const nextMatch = { ...match, t1: [...match.t1], t2: [...match.t2] };
    const firstSide = firstSlot.team === 1 ? nextMatch.t1 : nextMatch.t2;
    const secondSide = secondSlot.team === 1 ? nextMatch.t1 : nextMatch.t2;
    [firstSide[firstSlot.index], secondSide[secondSlot.index]] = [
      secondSide[secondSlot.index],
      firstSide[firstSlot.index]
    ];

    set({ matches: { ...state.matches, [matchKey]: nextMatch } });
    get().saveToHistory();
    return true;
  },

  executeSwap: (matchKey, selectedSlot, newEntity) => {
    const state = get();
    const currentMatch = state.matches[matchKey];
    if (!currentMatch || (currentMatch.score1 !== null && currentMatch.score2 !== null)) return false;

    let nextMatches = { ...state.matches };
    let m = { ...currentMatch, t1: [...currentMatch.t1], t2: [...currentMatch.t2] };
    const targetSide = selectedSlot.team === 1 ? m.t1 : m.t2;
    const displacedIds = [...targetSide];
    
    let isOccupiedByTeam = false;
    if (targetSide[0] !== null && targetSide[1] !== null) {
      isOccupiedByTeam = (state.teams || []).some((t) => 
        (t.playerIds[0] === targetSide[0] && t.playerIds[1] === targetSide[1]) ||
        (t.playerIds[0] === targetSide[1] && t.playerIds[1] === targetSide[0])
      );
    }

    let incomingIds;
    if (newEntity.type === 'team') {
      incomingIds = [newEntity.p1, newEntity.p2];
      targetSide[0] = incomingIds[0];
      targetSide[1] = incomingIds[1];
    } else {
      incomingIds = [newEntity.id];
      if (isOccupiedByTeam) {
        targetSide[0] = selectedSlot.index === 0 ? newEntity.id : null;
        targetSide[1] = selectedSlot.index === 1 ? newEntity.id : null;
      } else {
        targetSide[selectedSlot.index] = newEntity.id;
      }
    }

    nextMatches[matchKey] = m;

    const swappedOutIds = newEntity.type === 'team'
      ? displacedIds
      : [displacedIds[selectedSlot.index]];
    incomingIds.forEach((playerId, incomingIndex) => {
      const sourceMatchEntry = Object.entries(state.matches).find(([sourceKey, sourceMatch]) => (
        sourceKey !== matchKey &&
        (sourceMatch.score1 === null || sourceMatch.score2 === null) &&
        (sourceMatch.t1.includes(playerId) || sourceMatch.t2.includes(playerId))
      ));
      if (!sourceMatchEntry) return;

      const [sourceKey] = sourceMatchEntry;
      const sourceCopy = {
        ...nextMatches[sourceKey],
        t1: [...nextMatches[sourceKey].t1],
        t2: [...nextMatches[sourceKey].t2]
      };
      const sourceSide = sourceCopy.t1.includes(playerId) ? sourceCopy.t1 : sourceCopy.t2;
      const sourceIndex = sourceSide.indexOf(playerId);
      sourceSide[sourceIndex] = swappedOutIds[incomingIndex] ?? null;
      nextMatches[sourceKey] = sourceCopy;
    });

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
    get().saveToHistory();
    return true;
  },

  shuffleCourt: (matchKey) => {
    const state = get();
    const currentMatch = state.matches[matchKey];
    if (!currentMatch) return false;

    // Cannot shuffle already scored match
    if (currentMatch.score1 !== null && currentMatch.score2 !== null) {
      return false;
    }

    const activePlayers = state.players.filter((p) => !p.isWalkout);
    if (activePlayers.length < 4) return false;

    const { stats } = state.getLeaderboardStats();

    // Past matches for partner repeat count
    const sortedFinishedMatches = Object.values(state.matches).filter(
      (m) => m.score1 !== null && m.score2 !== null
    );

    const getPartnerRepeatCount = (id1, id2) => {
      if (!id1 || !id2) return 0;
      let count = 0;
      sortedFinishedMatches.forEach((m) => {
        const inT1 = m.t1.includes(id1) && m.t1.includes(id2);
        const inT2 = m.t2.includes(id1) && m.t2.includes(id2);
        if (inT1 || inT2) count++;
      });
      return count;
    };

    // Identify players on other courts in the same round
    const otherMatchesInRound = Object.values(state.matches).filter(
      (m) => m.round === currentMatch.round && m.court !== currentMatch.court
    );

    const scoredOtherPlayerIds = new Set();
    const unscoredOtherMatches = [];
    otherMatchesInRound.forEach((m) => {
      if (m.score1 !== null && m.score2 !== null) {
        m.t1.forEach((id) => id && scoredOtherPlayerIds.add(id));
        m.t2.forEach((id) => id && scoredOtherPlayerIds.add(id));
      } else {
        unscoredOtherMatches.push(m);
      }
    });

    const unscoredOtherPlayerIds = new Set();
    unscoredOtherMatches.forEach((m) => {
      m.t1.forEach((id) => id && unscoredOtherPlayerIds.add(id));
      m.t2.forEach((id) => id && unscoredOtherPlayerIds.add(id));
    });

    // Current players on this court
    const currentCourtPlayerIds = [...currentMatch.t1, ...currentMatch.t2].filter(Boolean);

    // Resting players in this round
    const restingPlayers = activePlayers.filter(
      (p) =>
        !currentCourtPlayerIds.includes(p.id) &&
        !scoredOtherPlayerIds.has(p.id) &&
        !unscoredOtherPlayerIds.has(p.id)
    );

    // Primary pool: current players on this court + resting players
    const candidatePlayerPool = activePlayers.filter(
      (p) =>
        currentCourtPlayerIds.includes(p.id) ||
        restingPlayers.some((rp) => rp.id === p.id)
    );

    // Extended pool: also include players from unscored other courts if resting players = 0
    let extendedPlayerPool = [...candidatePlayerPool];
    if (restingPlayers.length === 0 && unscoredOtherMatches.length > 0) {
      const unscoredOtherPlayers = activePlayers.filter((p) =>
        unscoredOtherPlayerIds.has(p.id)
      );
      extendedPlayerPool.push(...unscoredOtherPlayers);
    }

    // Helper to build entities (teams and solos) from a player pool
    const buildEntities = (poolPlayers) => {
      const handled = new Set();
      const entities = [];
      (state.teams || []).forEach((t) => {
        const p1 = poolPlayers.find((p) => p.id === t.playerIds[0]);
        const p2 = poolPlayers.find((p) => p.id === t.playerIds[1]);
        if (p1 && p2) {
          entities.push({
            isTeam: true,
            teamId: t.id,
            players: [p1, p2],
            playerIds: [p1.id, p2.id]
          });
          handled.add(p1.id);
          handled.add(p2.id);
        }
      });
      poolPlayers.forEach((p) => {
        if (!handled.has(p.id)) {
          entities.push({
            isTeam: false,
            players: [p],
            playerIds: [p.id]
          });
        }
      });
      return entities;
    };

    const areSetsEqual = (a, b) => {
      if (a.size !== b.size) return false;
      for (let item of a) {
        if (!b.has(item)) return false;
      }
      return true;
    };

    const prevT1Set = new Set(currentMatch.t1.filter(Boolean));
    const prevT2Set = new Set(currentMatch.t2.filter(Boolean));

    const isIdentical = (t1, t2) => {
      if (prevT1Set.size === 0 && prevT2Set.size === 0) return false;
      const s1 = new Set(t1);
      const s2 = new Set(t2);
      return (
        (areSetsEqual(s1, prevT1Set) && areSetsEqual(s2, prevT2Set)) ||
        (areSetsEqual(s1, prevT2Set) && areSetsEqual(s2, prevT1Set))
      );
    };

    const isMarked = state.config.type.includes('marked');
    const tierVal = { A: 4, B: 3, C: 2, D: 1 };
    const minGamesOverall = Math.min(...activePlayers.map((p) => stats[p.id]?.games || 0));

    // Calculate score / penalty for a candidate match { t1, t2 }
    const scoreCandidate = (t1, t2) => {
      const allIds = [...t1, ...t2];
      const playersObj = allIds.map((id) => state.players.find((p) => p.id === id)).filter(Boolean);

      // 1. Game Count Priority (fewer games = lower penalty)
      let penaltyGames = 0;
      playersObj.forEach((p) => {
        const pGames = stats[p.id]?.games || 0;
        penaltyGames += (pGames - minGamesOverall) * 60;
      });
      const gamesArr = playersObj.map((p) => stats[p.id]?.games || 0);
      const gameSpread = Math.max(...gamesArr) - Math.min(...gamesArr);
      penaltyGames += gameSpread * 25;

      // 2. Marked Tier Balance Priority
      let penaltyTier = 0;
      if (isMarked) {
        const t1Tiers = [playersObj[0]?.tier, playersObj[1]?.tier];
        const t2Tiers = [playersObj[2]?.tier, playersObj[3]?.tier];
        const sum1 = (tierVal[t1Tiers[0]] || 2.5) + (tierVal[t1Tiers[1]] || 2.5);
        const sum2 = (tierVal[t2Tiers[0]] || 2.5) + (tierVal[t2Tiers[1]] || 2.5);
        const diff = Math.abs(sum1 - sum2);
        penaltyTier = diff * 45;
      }

      // 3. Points Balance (Mexicano)
      let penaltyPoints = 0;
      if (!isMarked && state.config.type.includes('mexicano')) {
        const pts1 = (stats[playersObj[0]?.id]?.points || 0) + (stats[playersObj[1]?.id]?.points || 0);
        const pts2 = (stats[playersObj[2]?.id]?.points || 0) + (stats[playersObj[3]?.id]?.points || 0);
        penaltyPoints = Math.min(Math.abs(pts1 - pts2), 30) * 2;
      }

      // 4. Partner Repeat Avoidance
      let penaltyPartner = 0;
      const isFixedTeam1 = (state.teams || []).some(
        (t) =>
          (t.playerIds[0] === t1[0] && t.playerIds[1] === t1[1]) ||
          (t.playerIds[0] === t1[1] && t.playerIds[1] === t1[0])
      );
      const isFixedTeam2 = (state.teams || []).some(
        (t) =>
          (t.playerIds[0] === t2[0] && t.playerIds[1] === t2[1]) ||
          (t.playerIds[0] === t2[1] && t.playerIds[1] === t2[0])
      );
      if (!isFixedTeam1) {
        penaltyPartner += getPartnerRepeatCount(t1[0], t1[1]) * 40;
      }
      if (!isFixedTeam2) {
        penaltyPartner += getPartnerRepeatCount(t2[0], t2[1]) * 40;
      }

      return penaltyGames + penaltyTier + penaltyPoints + penaltyPartner;
    };

    // Generate candidate configurations from entity list
    const generateCandidates = (entities) => {
      const candidates = [];
      const n = entities.length;

      for (let i = 0; i < n; i++) {
        const e1 = entities[i];
        if (e1.players.length === 2) {
          for (let j = i + 1; j < n; j++) {
            const e2 = entities[j];
            if (e2.players.length === 2) {
              candidates.push({
                t1: [e1.players[0].id, e1.players[1].id],
                t2: [e2.players[0].id, e2.players[1].id],
                usedEntities: [e1, e2]
              });
            } else if (e2.players.length === 1) {
              for (let k = j + 1; k < n; k++) {
                const e3 = entities[k];
                if (e3.players.length === 1) {
                  candidates.push({
                    t1: [e1.players[0].id, e1.players[1].id],
                    t2: [e2.players[0].id, e3.players[0].id],
                    usedEntities: [e1, e2, e3]
                  });
                }
              }
            }
          }
        } else if (e1.players.length === 1) {
          for (let j = i + 1; j < n; j++) {
            const e2 = entities[j];
            if (e2.players.length === 2) {
              for (let k = j + 1; k < n; k++) {
                const e3 = entities[k];
                if (e3.players.length === 1) {
                  candidates.push({
                    t1: [e2.players[0].id, e2.players[1].id],
                    t2: [e1.players[0].id, e3.players[0].id],
                    usedEntities: [e1, e2, e3]
                  });
                }
              }
            } else if (e2.players.length === 1) {
              for (let k = j + 1; k < n; k++) {
                const e3 = entities[k];
                if (e3.players.length === 2) {
                  candidates.push({
                    t1: [e3.players[0].id, e3.players[1].id],
                    t2: [e1.players[0].id, e2.players[0].id],
                    usedEntities: [e1, e2, e3]
                  });
                } else if (e3.players.length === 1) {
                  for (let l = k + 1; l < n; l++) {
                    const e4 = entities[l];
                    if (e4.players.length === 1) {
                      const s1 = e1.players[0].id;
                      const s2 = e2.players[0].id;
                      const s3 = e3.players[0].id;
                      const s4 = e4.players[0].id;
                      candidates.push(
                        { t1: [s1, s2], t2: [s3, s4], usedEntities: [e1, e2, e3, e4] },
                        { t1: [s1, s3], t2: [s2, s4], usedEntities: [e1, e2, e3, e4] },
                        { t1: [s1, s4], t2: [s2, s3], usedEntities: [e1, e2, e3, e4] }
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
      return candidates;
    };

    let entities = buildEntities(candidatePlayerPool);
    let allCandidates = generateCandidates(entities);
    let validNonIdentical = allCandidates.filter((c) => !isIdentical(c.t1, c.t2));

    let usedExtendedPool = false;
    if (validNonIdentical.length === 0 && extendedPlayerPool.length > candidatePlayerPool.length) {
      entities = buildEntities(extendedPlayerPool);
      allCandidates = generateCandidates(entities);
      validNonIdentical = allCandidates.filter((c) => !isIdentical(c.t1, c.t2));
      if (validNonIdentical.length > 0) {
        usedExtendedPool = true;
      }
    }

    if (validNonIdentical.length === 0) {
      if (allCandidates.length > 0) {
        const fallback = allCandidates[0];
        validNonIdentical = [
          {
            t1: fallback.t2,
            t2: fallback.t1,
            usedEntities: fallback.usedEntities
          }
        ];
      } else {
        return false;
      }
    }

    const scoredCandidates = validNonIdentical.map((c) => ({
      ...c,
      penalty: scoreCandidate(c.t1, c.t2)
    }));

    scoredCandidates.sort((a, b) => a.penalty - b.penalty);

    const minPenalty = scoredCandidates[0].penalty;
    const topCandidates = scoredCandidates.filter((c) => c.penalty <= minPenalty + 30);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    let nextMatches = { ...state.matches };
    const updatedCourtMatch = {
      ...currentMatch,
      t1: chosen.t1,
      t2: chosen.t2
    };
    nextMatches[matchKey] = updatedCourtMatch;

    if (usedExtendedPool) {
      const chosenPlayerIds = new Set([...chosen.t1, ...chosen.t2]);
      unscoredOtherMatches.forEach((otherM) => {
        const otherMatchKey = `r${otherM.round}-c${otherM.court}`;
        let otherT1 = [...(nextMatches[otherMatchKey]?.t1 || otherM.t1)];
        let otherT2 = [...(nextMatches[otherMatchKey]?.t2 || otherM.t2)];
        let missingFromOther = [];

        otherT1 = otherT1.map((id) => {
          if (id && chosenPlayerIds.has(id)) {
            missingFromOther.push(id);
            return null;
          }
          return id;
        });
        otherT2 = otherT2.map((id) => {
          if (id && chosenPlayerIds.has(id)) {
            missingFromOther.push(id);
            return null;
          }
          return id;
        });

        if (missingFromOther.length > 0) {
          const displaced = currentCourtPlayerIds.filter((id) => !chosenPlayerIds.has(id));
          let displacedIdx = 0;
          otherT1 = otherT1.map((id) => {
            if (id === null && displacedIdx < displaced.length) {
              return displaced[displacedIdx++];
            }
            return id;
          });
          otherT2 = otherT2.map((id) => {
            if (id === null && displacedIdx < displaced.length) {
              return displaced[displacedIdx++];
            }
            return id;
          });

          nextMatches[otherMatchKey] = {
            ...otherM,
            t1: otherT1,
            t2: otherT2
          };
        }
      });
    }

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
    get().saveToHistory();
    return true;
  },

  getLeaderboardStats: () => {
    const state = get();
    let stats = {};
    state.players.forEach((p) => {
      stats[p.id] = { games: 0, wins: 0, losses: 0, ties: 0, points: 0, diff: 0, rests: 0, streak: 0 };
    });

    const sortedMatches = Object.values(state.matches)
      .filter((m) => m.score1 !== null && m.score2 !== null)
      .sort((a, b) => a.round - b.round);

    const roundsWithFinishedMatches = new Set(sortedMatches.map((m) => m.round));
    const playerFinishedRounds = {};
    state.players.forEach((p) => { playerFinishedRounds[p.id] = new Set(); });

    sortedMatches.forEach((m) => {
      m.t1.forEach((id) => {
        if (stats[id]) {
          stats[id].games++;
          stats[id].points += m.score1;
          stats[id].diff += m.score1 - m.score2;
          playerFinishedRounds[id]?.add(m.round);
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
          playerFinishedRounds[id]?.add(m.round);
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
      if (!p.isWalkout) {
        let restCount = 0;
        roundsWithFinishedMatches.forEach((r) => {
          if (!playerFinishedRounds[p.id].has(r)) {
            restCount++;
          }
        });
        stats[p.id].rests = restCount;
      } else {
        stats[p.id].rests = 0;
      }
      
      let s = stats[p.id];
      s.totalPts = s.points + s.wins * (state.config.bonus || 0) + s.rests * (state.config.restBonus || 0);
    });

    let leaderboardItems = [];
    let handledPlayers = new Set();
    
    (state.teams || []).forEach((t) => {
      let p1 = state.players.find((p) => p.id === t.playerIds[0]);
      let p2 = state.players.find((p) => p.id === t.playerIds[1]);
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

    state.players.forEach((p) => {
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
