import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/useTournamentStore';
import { FileText, List, X, Plus, History, Edit3, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from '../store/useToastStore';

let tempIdCounter = 1000;

function rowsToBulkText(rows, marked) {
  return rows
    .filter(r => r.name.trim() !== '')
    .map(r => {
      const offSuffix = r.isInactive ? ' [OFF]' : '';
      return marked ? `${r.name.trim()} - ${r.tier || 'B'}${offSuffix}` : `${r.name.trim()}${offSuffix}`;
    })
    .join('\n');
}

function bulkTextToRows(text, existingRows = []) {
  const lines = text.split('\n');
  const newRows = [];
  const usedExistingIds = new Set();

  lines.forEach((line) => {
    let trimmed = line.trim();
    if (!trimmed) return;

    const isInactive = trimmed.includes('[OFF]') || trimmed.includes('[off]');
    let cleanLine = trimmed.replace(/\[OFF\]/gi, '').trim();

    let name = cleanLine;
    let tier = 'B';

    if (cleanLine.includes('-')) {
      const parts = cleanLine.split('-');
      name = parts[0].trim();
      const rawTier = parts[1].trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(rawTier)) {
        tier = rawTier;
      }
    }

    if (!name) return;

    const match = existingRows.find(r => !usedExistingIds.has(r.id) && r.name.trim().toLowerCase() === name.toLowerCase());

    if (match) {
      usedExistingIds.add(match.id);
      newRows.push({
        ...match,
        name,
        tier,
        isInactive
      });
    } else {
      tempIdCounter++;
      newRows.push({
        id: tempIdCounter,
        name,
        tier,
        isInactive,
        pid: null
      });
    }
  });

  if (newRows.length === 0) {
    tempIdCounter++;
    newRows.push({ id: tempIdCounter, name: '', tier: 'B', isInactive: false, pid: null });
  }
  return newRows;
}

export default function SetupView() {
  const { 
    config, currentView, setView, numCourts, customCourtNames, 
    players, isTournamentStarted, matches, startTournament, 
    saveConfigChanges, loadFromHistory, deleteTournament 
  } = useTournamentStore();
  
  const [localConfig, setLocalConfig] = useState(() => config);
  const [localCourts, setLocalCourts] = useState(() => numCourts);
  const [localCourtNames, setLocalCourtNames] = useState(() => customCourtNames);

  const hasScoredMatches = Object.values(matches).some(m => m.score1 !== null && m.score2 !== null);
  const isDisabled = isTournamentStarted && hasScoredMatches;
  
  const [inputMode, setInputMode] = useState('row'); // 'row' | 'bulk'
  const [playerRows, setPlayerRows] = useState(() => {
    if (players.length > 0) {
      const rows = players.map(p => ({
        id: p.id,
        name: p.name,
        tier: p.tier,
        isInactive: p.isWalkout,
        pid: p.id
      }));
      if (currentView === 'config') {
        rows.push({ id: 999999, name: '', tier: 'B', isInactive: false, pid: null });
      }
      return rows;
    }
    return [
      { id: 1, name: '', tier: 'B', isInactive: false, pid: null },
      { id: 2, name: '', tier: 'B', isInactive: false, pid: null },
      { id: 3, name: '', tier: 'B', isInactive: false, pid: null }
    ];
  });

  const isMarked = localConfig.type.includes('marked');

  const [bulkText, setBulkText] = useState(() => {
    if (players.length > 0) {
      return rowsToBulkText(players, config.type.includes('marked'));
    }
    return '';
  });

  const [localTeams, setLocalTeams] = useState(() => useTournamentStore.getState().teams || []);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedP1, setSelectedP1] = useState('');
  const [selectedP2, setSelectedP2] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('padel_history') || '[]');
    } catch {
      return [];
    }
  });

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  const openHistoryModal = () => {
    try {
      setHistoryList(JSON.parse(localStorage.getItem('padel_history') || '[]'));
    } catch {
      setHistoryList([]);
    }
    setShowHistory(true);
  };

  useEffect(() => {
    const handleRandom = (e) => {
      const { generatedPlayers, randomCourts } = e.detail;
      setLocalCourts(randomCourts);
      let names = {};
      for (let i = 1; i <= randomCourts; i++) {
        names[i] = `Court ${i}`;
      }
      setLocalCourtNames(names);
      
      const rows = generatedPlayers.map((p, idx) => ({
        id: Date.now() + idx,
        name: p.name,
        tier: p.tier,
        isInactive: false,
        pid: null
      }));
      setPlayerRows(rows);
      setBulkText(rowsToBulkText(rows, localConfig.type.includes('marked')));
      setLocalTeams([]);

      setLocalConfig(prev => ({
        ...prev,
        name: "Testcase Padel Tournament"
      }));
    };
    window.addEventListener('generate-random-test', handleRandom);
    return () => window.removeEventListener('generate-random-test', handleRandom);
  }, [localConfig.type]);

  const handleConfigChange = (e) => {
    if (isDisabled) return;
    const { name, value, type, checked } = e.target;
    let val = value;
    if (type === 'number') {
      val = value === '' ? '' : parseInt(value, 10);
    }
    if (type === 'checkbox') val = checked;
    
    setLocalConfig(prev => ({ ...prev, [name]: val }));
  };

  const handleCourtNameChange = (i, value) => {
    setLocalCourtNames(prev => ({ ...prev, [i]: value }));
  };

  const addRow = () => {
    setPlayerRows(prev => {
      tempIdCounter++;
      const updated = [...prev, { id: tempIdCounter, name: '', tier: 'B', isInactive: false, pid: null }];
      setBulkText(rowsToBulkText(updated, isMarked));
      return updated;
    });
  };

  const updateRow = (id, field, value) => {
    setPlayerRows(prev => {
      let newRows = prev.map(row => row.id === id ? { ...row, [field]: value } : row);
      if (field === 'isInactive') {
        const team = localTeams.find(t => t.playerIds[0] === id || t.playerIds[1] === id);
        if (team) {
          const partnerId = team.playerIds[0] === id ? team.playerIds[1] : team.playerIds[0];
          newRows = newRows.map(row => row.id === partnerId ? { ...row, [field]: value } : row);
        }
      }
      setBulkText(rowsToBulkText(newRows, isMarked));
      return newRows;
    });
  };

  const removeRow = (id) => {
    setPlayerRows(prev => {
      const updated = prev.filter(row => row.id !== id);
      setBulkText(rowsToBulkText(updated, isMarked));
      return updated;
    });
    setLocalTeams(prev => prev.filter(t => t.playerIds[0] !== id && t.playerIds[1] !== id));
  };

  const handleBulkChange = (text) => {
    setBulkText(text);
    const parsedRows = bulkTextToRows(text, playerRows);
    setPlayerRows(parsedRows);
  };

  const switchInputMode = (mode) => {
    if (mode === 'bulk') {
      setBulkText(rowsToBulkText(playerRows, isMarked));
    } else {
      const parsedRows = bulkTextToRows(bulkText, playerRows);
      setPlayerRows(parsedRows);
    }
    setInputMode(mode);
  };

  const removeTeam = (id) => {
    setLocalTeams(prev => prev.filter(t => t.id !== id));
  };

  const editTeam = (team) => {
    setNewTeamName(team.name);
    setSelectedP1(team.playerIds[0]);
    setSelectedP2(team.playerIds[1]);
    removeTeam(team.id);
  };

  const createTeam = () => {
    if (!newTeamName.trim() || !selectedP1 || !selectedP2) return toast.error("Pilih dua pemain dan isi nama tim.");
    if (selectedP1 === selectedP2) return toast.error("Pilih pemain yang berbeda.");
    const p1 = parseInt(selectedP1);
    const p2 = parseInt(selectedP2);
    setLocalTeams(prev => [...prev, {
      id: `t_${Date.now()}`,
      name: newTeamName.trim(),
      playerIds: [p1, p2]
    }]);
    setNewTeamName('');
    setSelectedP1('');
    setSelectedP2('');
  };

  const autoAssignTeams = () => {
    let activePlayers = playerRows.filter(r => r.name.trim() !== '' && !r.isInactive);
    let assignedIds = new Set();
    localTeams.forEach(t => {
      assignedIds.add(t.playerIds[0]);
      assignedIds.add(t.playerIds[1]);
    });
    
    let availableSolos = activePlayers.filter(p => !assignedIds.has(p.id));
    if (availableSolos.length < 2) return toast.error('Tidak cukup pemain solo untuk dipasangkan.');
    
    let newTeams = [...localTeams];
    for (let i = 0; i < availableSolos.length - 1; i += 2) {
      newTeams.push({
        id: `t_${Date.now()}_${i}`,
        name: `Team ${newTeams.length + 1}`,
        playerIds: [availableSolos[i].id, availableSolos[i+1].id]
      });
    }
    setLocalTeams(newTeams);
    toast.success(`${Math.floor(availableSolos.length / 2)} tim baru berhasil di-assign otomatis.`);
  };

  const handleSave = () => {
    const rowsToParse = inputMode === 'bulk' ? bulkTextToRows(bulkText, playerRows) : playerRows;
    const parsedData = rowsToParse.filter(r => r.name.trim() !== '').map(r => ({
      name: r.name.trim(),
      tier: r.tier,
      pid: r.pid,
      tempId: r.id,
      isInactive: r.isInactive
    }));

    const activePlayers = parsedData.filter(p => !p.isInactive);
    if (activePlayers.length < 4) {
      toast.error("Minimal harus ada 4 pemain aktif untuk memulai turnamen!");
      return;
    }

    const names = parsedData.map(r => r.name.toLowerCase());
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      toast.error("Terdapat nama pemain yang kembar (duplikat). Harap periksa kembali list pemain dan pastikan nama berbeda.");
      return;
    }

    const maxPts = Number.isInteger(localConfig.maxPoints) && localConfig.maxPoints > 0 ? localConfig.maxPoints : 21;
    const cleanConfig = { ...localConfig, maxPoints: maxPts };

    if (currentView === 'config') {
      saveConfigChanges(parsedData, localCourts, cleanConfig, localCourtNames, localTeams);
      toast.success("Perubahan turnamen berhasil disimpan!");
    } else {
      startTournament(parsedData, localCourts, cleanConfig, localCourtNames, localTeams);
      toast.success("Turnamen berhasil dimulai!");
    }
  };

  const handleDeleteHistory = (id, name) => {
    if (window.confirm(`Yakin ingin menghapus turnamen "${name}" dari history?`)) {
      deleteTournament(id);
      setHistoryList(prev => prev.filter(h => h.id !== id));
      toast.success("Turnamen berhasil dihapus dari history");
    }
  };

  const handleOpenHistory = (id) => {
    const success = loadFromHistory(id);
    if (success) {
      setShowHistory(false);
      toast.success("Turnamen berhasil dibuka!");
    } else {
      toast.error("Gagal membuka turnamen dari history.");
    }
  };

  if (currentView !== 'setup' && currentView !== 'config') return null;

  const getDuplicateIds = () => {
    const nameCounts = {};
    playerRows.forEach(r => {
      const n = r.name.trim().toLowerCase();
      if (n) nameCounts[n] = (nameCounts[n] || 0) + 1;
    });
    const dups = new Set();
    playerRows.forEach(r => {
      const n = r.name.trim().toLowerCase();
      if (n && nameCounts[n] > 1) dups.add(r.id);
    });
    return dups;
  };
  const duplicateIds = getDuplicateIds();

  return (
    <div className="w-full fade-in flex-shrink-0 flex flex-col gap-6 md:bg-slate-800 md:p-6 md:rounded-2xl md:shadow-xl md:border md:border-slate-700">
      <div className="space-y-6 flex-grow">
        
        {/* Tournament Info */}
        <div className="bg-slate-900/80 p-4 md:p-5 rounded-xl border border-slate-700/80 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 border-b border-slate-700/50 pb-2 mb-2 flex justify-between items-center">
            <h2 className="text-lg font-bold text-amber-400">Tournament Info</h2>
            {!isDisabled && currentView === 'setup' && (
              <button onClick={openHistoryModal} className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-600 transition flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                History ({historyList.length})
              </button>
            )}
          </div>
          
          <div className="md:col-span-2">
            <div className="w-full">
              <label className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">Nama Turnamen</label>
              <input type="text" name="name" value={localConfig.name} onChange={handleConfigChange} placeholder="Contoh: Padel DNA Weekly" className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition placeholder-slate-500" disabled={isDisabled} />
            </div>
          </div>
          
          <div className="flex gap-3 md:col-span-2">
            <div className="w-1/2">
              <label className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">Tipe Game</label>
              <select name="type" value={localConfig.type} onChange={handleConfigChange} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-emerald-400 text-sm outline-none font-bold focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50" disabled={isDisabled}>
                <option value="marked_mexicano">Marked Mexicano</option>
                <option value="marked_americano">Marked Americano</option>
                <option value="mexicano">Mexicano (Pure)</option>
                <option value="americano">Americano (Pure)</option>
              </select>
            </div>
            <div className="w-1/2">
              <label className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">Leaderboard Sort By</label>
              <select name="sort" value={localConfig.sort} onChange={handleConfigChange} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50" disabled={isDisabled}>
                <option value="points">Points</option>
                <option value="wins">Win</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">Poin / Round</label>
              <input type="number" name="maxPoints" value={localConfig.maxPoints} onChange={handleConfigChange} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-emerald-400 text-sm outline-none text-center font-bold focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50" disabled={isDisabled} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">Win Bonus</label>
              <input type="number" name="bonus" value={localConfig.bonus} onChange={handleConfigChange} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm outline-none text-center focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50" disabled={isDisabled} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">Rest Bonus</label>
              <input type="number" name="restBonus" value={localConfig.restBonus} onChange={handleConfigChange} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm outline-none text-center focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50" disabled={isDisabled} />
            </div>
          </div>
          {isDisabled && (
            <div className="md:col-span-2 text-center text-xs text-amber-500 bg-amber-900/20 p-2 rounded-lg border border-amber-800/50 mt-4">
              Pengaturan turnamen dikunci karena pertandingan sudah berjalan dan memiliki skor.
            </div>
          )}
        </div>

        {/* Court Config */}
        <div className="bg-slate-900/80 p-4 md:p-5 rounded-xl border border-slate-700/80 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <label className="font-bold text-slate-300">Jumlah Lapangan:</label>
            <div className="flex items-center gap-2">
              <button onClick={() => !isDisabled && setLocalCourts(Math.max(1, localCourts - 1))} className="bg-slate-700 hover:bg-slate-600 w-8 h-8 rounded-lg font-bold text-white transition shadow disabled:opacity-50" disabled={isDisabled}>-</button>
              <input type="number" value={localCourts} readOnly className="w-14 bg-slate-800 border border-slate-600 rounded-lg p-1 text-white text-center font-bold outline-none pointer-events-none disabled:opacity-50" disabled={isDisabled} />
              <button onClick={() => !isDisabled && setLocalCourts(localCourts + 1)} className="bg-slate-700 hover:bg-slate-600 w-8 h-8 rounded-lg font-bold text-white transition shadow disabled:opacity-50" disabled={isDisabled}>+</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-slate-700/50 pt-4">
            {Array.from({ length: localCourts }).map((_, i) => {
              const courtNum = i + 1;
              return (
                <div key={courtNum} className="flex flex-col">
                  <label className="text-[10px] text-slate-400 mb-1 font-mono uppercase">Nama L{courtNum}</label>
                  <input type="text" value={localCourtNames[courtNum] || `Court ${courtNum}`} onChange={(e) => handleCourtNameChange(courtNum, e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500 transition" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Input with Bulk Sync */}
        <div className="bg-slate-700/30 p-4 md:p-5 rounded-xl border border-slate-600 flex flex-col min-w-0 mb-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <label className="block text-sm font-bold text-slate-400 shrink-0">Data Pemain & Team</label>
              
              {/* Mode Switcher */}
              <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-600">
                <button
                  type="button"
                  onClick={() => switchInputMode('row')}
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition",
                    inputMode === 'row' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <List className="w-3.5 h-3.5" /> Baris
                </button>
                <button
                  type="button"
                  onClick={() => switchInputMode('bulk')}
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition",
                    inputMode === 'bulk' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" /> Sekaligus (Bulk)
                </button>
              </div>
            </div>

            <button onClick={() => setShowTeamModal(true)} disabled={isDisabled} className="text-xs bg-slate-600/80 hover:bg-slate-500 text-white px-3 py-2 rounded-lg transition font-bold shadow flex items-center gap-1.5 shrink-0 disabled:opacity-50">
              <Plus className="w-4 h-4"/> Set Team
            </button>
          </div>
          
          {inputMode === 'row' ? (
            <div className="space-y-2 flex-grow min-w-0 w-full overflow-hidden">
              <div className="text-[10px] font-normal text-slate-500 mb-2 uppercase tracking-wide">* Tekan 'Enter' di kolom nama untuk baris baru</div>
              <div className="space-y-2 w-full">
                {playerRows.map((row, index) => {
                  const teamObj = localTeams.find(t => t.playerIds.includes(row.id));
                  return (
                    <div key={row.id} className="flex items-center gap-2 player-row">
                      <span className="w-4 shrink-0 text-slate-500 font-mono text-right font-bold text-xs">{index + 1}.</span>
                      <div className="relative min-w-0 flex-grow">
                        <input 
                          type="text" 
                          placeholder="Nama" 
                          value={row.name} 
                          disabled={isDisabled}
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (index === playerRows.length - 1) addRow();
                            }
                          }}
                          className={clsx(
                            "w-full bg-slate-900 border rounded-lg p-2.5 text-white text-sm outline-none transition",
                            duplicateIds.has(row.id) ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-slate-600 focus:ring-1 focus:ring-emerald-500",
                            isDisabled && "opacity-60 cursor-not-allowed"
                          )} 
                        />
                        {teamObj && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-indigo-500/80 text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider">{teamObj.name}</div>
                        )}
                      </div>
                      {isMarked && (
                        <select 
                          value={row.tier} 
                          onChange={(e) => updateRow(row.id, 'tier', e.target.value)}
                          disabled={isDisabled}
                          className="w-16 shrink-0 bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50"
                        >
                          {['A','B','C','D'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                      <div className="shrink-0 flex items-center gap-2">
                        <label className="flex items-center cursor-pointer ml-1" title="Toggle Active Status">
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={!row.isInactive} onChange={(e) => updateRow(row.id, 'isInactive', !e.target.checked)} />
                            <div className={clsx("block w-8 h-4 rounded-full transition-colors", !row.isInactive ? "bg-emerald-500" : "bg-slate-600")}></div>
                            <div className={clsx("absolute left-[2px] top-[2px] bg-white w-3 h-3 rounded-full transition-transform", !row.isInactive ? "translate-x-[16px]" : "")}></div>
                          </div>
                        </label>
                        <button onClick={() => removeRow(row.id)} disabled={isDisabled} className="shrink-0 text-slate-500 hover:text-red-400 p-1.5 transition ml-1 disabled:opacity-50" title="Hapus Baris">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!isDisabled && (
                <button onClick={addRow} className="mt-3 text-xs flex items-center justify-center w-full gap-1 p-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700/50 transition">
                  <Plus className="w-4 h-4" /> Tambah Pemain
                </button>
              )}
            </div>
          ) : (
            <div className="w-full fade-in space-y-2">
              <div className="text-xs font-normal text-slate-400 bg-slate-800 p-3 rounded-lg border border-slate-700 leading-relaxed">
                Format per baris: <b className="text-emerald-400">{isMarked ? 'NAMA - TIER' : 'NAMA'}</b> (Contoh: <span className="font-mono text-amber-400">{isMarked ? 'Adi - A' : 'Adi'}</span>).<br />
                Tambahkan <span className="text-red-400 font-mono">[OFF]</span> di akhir baris untuk pemain tidak aktif/istirahat.
              </div>
              <textarea
                rows={Math.max(6, Math.min(15, playerRows.length + 2))}
                value={bulkText}
                onChange={(e) => handleBulkChange(e.target.value)}
                disabled={isDisabled}
                placeholder={isMarked ? "Budi - A\nAndi - B\nClara - C\nKevin - D [OFF]" : "Budi\nAndi\nClara\nKevin [OFF]"}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-sm leading-relaxed hide-scrollbar"
              />
              <div className="text-[11px] text-slate-500 italic">
                * Data otomatis tersinkronisasi langsung dengan tampilan baris di atas.
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Action Bar */}
      <div className="shrink-0 bg-slate-900 md:bg-transparent p-4 border-t border-slate-700 md:border-none flex gap-4 w-full z-20 mt-auto md:mt-0">
        {currentView === 'config' && (
          <button onClick={() => setView('manager')} className="w-1/4 bg-slate-700/80 hover:bg-slate-600 text-slate-200 font-bold py-3 rounded-xl transition border border-slate-600 shadow-lg">Cancel</button>
        )}
        <button onClick={handleSave} className="w-full bg-blue-600/90 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-900/30 text-lg flex items-center justify-center gap-2">
          {currentView === 'config' ? 'Save Changes' : 'Start Tournament'}
        </button>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm fade-in">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl max-w-md w-full p-5 relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowHistory(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition bg-slate-700/50 hover:bg-slate-600 rounded-full p-1.5 z-10">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700/50 pb-3 flex items-center gap-2 pr-8 tracking-tight">
              <History className="w-5 h-5 text-emerald-400" />
              Tournament History
            </h3>
            <div className="overflow-y-auto space-y-3 pr-1 pb-2 flex-grow hide-scrollbar">
              {historyList.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8">Belum ada riwayat turnamen yang tersimpan.</div>
              ) : (
                historyList.map((h, i) => (
                  <div key={h.id || i} className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 flex flex-col gap-2.5 group hover:border-slate-500 transition shadow">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-slate-200 text-sm leading-tight">{h.name}</div>
                      <div className="text-[9px] text-slate-400 bg-slate-800 px-2 py-1 rounded-md border border-slate-700 shrink-0 uppercase tracking-wider">{formatDate(h.createdAt)}</div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-slate-400 flex gap-4 font-medium bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                        <span className="flex gap-1 items-center"><b className="text-amber-400">{h.playersCount}</b> Players</span>
                        <span className="flex gap-1 items-center"><b className="text-emerald-400">{h.courtsCount}</b> Courts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteHistory(h.id, h.name)}
                          className="text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 p-2 rounded-lg border border-slate-700 transition"
                          title="Hapus dari History"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                        <button 
                          onClick={() => handleOpenHistory(h.id)} 
                          className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition font-bold shadow-lg shadow-blue-900/50 flex items-center gap-1.5"
                        >
                          Buka
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm fade-in">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl max-w-md w-full p-5 relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowTeamModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition bg-slate-700/50 hover:bg-slate-600 rounded-full p-1.5 z-10">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700/50 pb-3 flex items-center gap-2">
              <List className="w-5 h-5 text-indigo-400" />
              Kelola Tim
            </h3>

            <div className="space-y-4 overflow-y-auto pr-1 pb-2 hide-scrollbar">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <label className="text-[10px] text-slate-400 font-mono uppercase mb-1 block">Buat Tim Baru</label>
                <input 
                  type="text" 
                  placeholder="Nama Tim" 
                  value={newTeamName} 
                  onChange={e => setNewTeamName(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm outline-none mb-2" 
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <select value={selectedP1} onChange={e => setSelectedP1(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white outline-none">
                    <option value="">Pemain 1</option>
                    {playerRows.filter(p => p.name && !localTeams.some(t => t.playerIds.includes(p.id))).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select value={selectedP2} onChange={e => setSelectedP2(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white outline-none">
                    <option value="">Pemain 2</option>
                    {playerRows.filter(p => p.name && !localTeams.some(t => t.playerIds.includes(p.id))).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={createTeam} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition text-xs shadow-lg shadow-indigo-900/30">
                    Tambah Tim
                  </button>
                  <button onClick={autoAssignTeams} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition text-xs shadow">
                    Auto Assign
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {localTeams.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-4">Belum ada tim yang dibuat.</div>
                ) : (
                  localTeams.map(t => {
                    const p1 = playerRows.find(p => p.id === t.playerIds[0]);
                    const p2 = playerRows.find(p => p.id === t.playerIds[1]);
                    return (
                      <div key={t.id} className="bg-slate-800 border border-slate-600 rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm text-indigo-400">{t.name}</div>
                          <div className="text-xs text-slate-300">{p1?.name || '?'} & {p2?.name || '?'}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => editTeam(t)} className="text-slate-400 hover:text-indigo-400 bg-slate-900 p-1.5 rounded-lg transition" title="Edit Tim">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeTeam(t.id)} className="text-slate-500 hover:text-red-400 bg-slate-900 p-1.5 rounded-lg transition" title="Hapus Tim">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
