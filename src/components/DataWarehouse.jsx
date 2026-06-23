import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, SlidersHorizontal, RefreshCw, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function DataWarehouse() {
  const [results, setResults] = useState([]);
  const [carModels, setCarModels] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [tracks, setTracks] = useState([]);

  // Filter States
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCar, setSelectedCar] = useState('all');
  const [selectedNationality, setSelectedNationality] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [selectedTrack, selectedType, selectedCar, selectedNationality]);

  const fetchFilterOptions = async () => {
    try {
      // Fetch car models
      const { data: cars } = await supabase.from('car_models').select('*').order('name');
      if (cars) setCarModels(cars);

      // Fetch nationalities
      const { data: nats } = await supabase.from('nationalities').select('*').order('country_name');
      if (nats) setNationalities(nats);

      // Fetch tracks (distinct track names from sessions)
      const { data: ses } = await supabase.from('sessions').select('track_name');
      if (ses) {
        const uniqueTracks = [...new Set(ses.map(s => s.track_name))];
        setTracks(uniqueTracks);
      } else {
        setTracks(['monza', 'spa', 'silverstone', 'nurburgring', 'kyalami']);
      }
    } catch (err) {
      console.warn('Failed to load filter options from database. Using mock filters.', err);
      setTracks(['monza', 'spa', 'silverstone', 'nurburgring', 'kyalami']);
      setCarModels([
        { id: 32, name: 'Ferrari 296 GT3', class: 'GT3' },
        { id: 30, name: 'BMW M4 GT3', class: 'GT3' },
        { id: 34, name: 'Porsche 992 GT3 R', class: 'GT3' }
      ]);
      setNationalities([
        { id: 1, country_name: 'Italy', iso_alpha2: 'IT' },
        { id: 2, country_name: 'Germany', iso_alpha2: 'DE' },
        { id: 39, country_name: 'USA', iso_alpha2: 'US' }
      ]);
    }
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('session_results')
        .select(`
          id,
          laps_completed,
          total_time_ms,
          best_lap_time_ms,
          is_fastest_lap,
          dnf,
          dns,
          position_raw,
          car_model_id,
          nationality_id,
          sessions!inner (
            session_type,
            track_name,
            session_date,
            round_number
          ),
          drivers (
            first_name,
            last_name,
            steam_id
          ),
          teams (
            name,
            abbreviation,
            color
          ),
          car_models (
            name,
            class
          ),
          nationalities (
            country_name,
            iso_alpha2
          )
        `);

      if (selectedTrack !== 'all') {
        query = query.eq('sessions.track_name', selectedTrack);
      }
      if (selectedType !== 'all') {
        query = query.eq('sessions.session_type', selectedType);
      }
      if (selectedCar !== 'all') {
        query = query.eq('car_model_id', parseInt(selectedCar));
      }
      if (selectedNationality !== 'all') {
        query = query.eq('nationality_id', parseInt(selectedNationality));
      }

      // Order by session date desc, and position raw asc
      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      setResults(data || []);
    } catch (err) {
      console.warn('DB Query failed, loading mock warehouse records:', err);
      setError('Database connection error. Displaying preview mock data.');
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const mockRecords = [
      {
        id: 'r1',
        laps_completed: 30,
        total_time_ms: 3600000,
        best_lap_time_ms: 119500,
        is_fastest_lap: true,
        dnf: false,
        dns: false,
        position_raw: 1,
        sessions: { session_type: 'Race', track_name: 'monza', session_date: '2026-06-22', round_number: 1 },
        drivers: { first_name: 'Max', last_name: 'Verstappen', steam_id: '76561198000000001' },
        teams: { name: 'Red Bull Racing', abbreviation: 'RBR', color: '#0600ef' },
        car_models: { name: 'Ferrari 296 GT3', class: 'GT3' },
        nationalities: { country_name: 'Netherlands', iso_alpha2: 'NL' }
      },
      {
        id: 'r2',
        laps_completed: 30,
        total_time_ms: 3615000,
        best_lap_time_ms: 119800,
        is_fastest_lap: false,
        dnf: false,
        dns: false,
        position_raw: 2,
        sessions: { session_type: 'Race', track_name: 'monza', session_date: '2026-06-22', round_number: 1 },
        drivers: { first_name: 'Charles', last_name: 'Leclerc', steam_id: '76561198000000002' },
        teams: { name: 'Ferrari Simracing', abbreviation: 'SCR', color: '#ff0000' },
        car_models: { name: 'Ferrari 296 GT3', class: 'GT3' },
        nationalities: { country_name: 'Monaco', iso_alpha2: 'MC' }
      },
      {
        id: 'r3',
        laps_completed: 15,
        total_time_ms: 600000,
        best_lap_time_ms: 120500,
        is_fastest_lap: false,
        dnf: false,
        dns: false,
        position_raw: 1,
        sessions: { session_type: 'Qualifying', track_name: 'spa', session_date: '2026-06-18', round_number: 1 },
        drivers: { first_name: 'Lando', last_name: 'Norris', steam_id: '76561198000000003' },
        teams: { name: 'McLaren Shadow', abbreviation: 'MCL', color: '#ff8700' },
        car_models: { name: 'Porsche 992 GT3 R', class: 'GT3' },
        nationalities: { country_name: 'Great Britain', iso_alpha2: 'GB' }
      }
    ];

    // Filter locally if filters are applied
    let filtered = mockRecords;
    if (selectedTrack !== 'all') filtered = filtered.filter(r => r.sessions.track_name === selectedTrack);
    if (selectedType !== 'all') filtered = filtered.filter(r => r.sessions.session_type === selectedType);
    if (selectedCar !== 'all') filtered = filtered.filter(r => r.car_model_id === parseInt(selectedCar) || (selectedCar === '32' && r.car_models.name.includes('Ferrari')));
    if (selectedNationality !== 'all') filtered = filtered.filter(r => r.nationality_id === parseInt(selectedNationality) || (selectedNationality === '1' && r.nationalities.country_name === 'Italy'));

    setResults(filtered);
  };

  const formatMs = (ms) => {
    if (!ms) return '--:--.---';
    const totalSecs = ms / 1000;
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const millis = Math.floor((ms % 1000));
    return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 glass-panel rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-8 h-8 text-indigo-400 glow-accent" /> TELEMETRY DATA WAREHOUSE
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Browse, query, and audit complete historical timing and classification telemetry.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Controls Panel */}
      <div className="p-5 glass-panel rounded-xl border border-slate-800/80 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold text-sm">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <span>Query Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Track Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Track</label>
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-xs cursor-pointer capitalize"
            >
              <option value="all">All Tracks</option>
              {tracks.map(t => (
                <option key={t} value={t} className="bg-slate-950 capitalize">{t}</option>
              ))}
            </select>
          </div>

          {/* Session Type Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Session Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-xs cursor-pointer"
            >
              <option value="all">All Session Types</option>
              <option value="Practice" className="bg-slate-950">Practice</option>
              <option value="Qualifying" className="bg-slate-950">Qualifying</option>
              <option value="Race" className="bg-slate-950">Race</option>
              <option value="Entrylist" className="bg-slate-950">Entrylist</option>
            </select>
          </div>

          {/* Car Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Car Model</label>
            <select
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-xs cursor-pointer"
            >
              <option value="all">All Cars</option>
              {carModels.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-950">{c.name}</option>
              ))}
            </select>
          </div>

          {/* Nationality Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Driver Nationality</label>
            <select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-xs cursor-pointer"
            >
              <option value="all">All Nationalities</option>
              {nationalities.map(n => (
                <option key={n.id} value={n.id} className="bg-slate-950">{n.country_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Telemetry Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-slate-400 text-sm">Querying historical records...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-xl">
          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No telemetry records match your filters.</p>
          <p className="text-slate-600 text-xs mt-1">Try expanding your search criteria or uploading results.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-left border-collapse glass-panel">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Event Info</th>
                <th className="py-4 px-6">Driver & Team</th>
                <th className="py-4 px-6">Car Model</th>
                <th className="py-4 px-6 text-center">Pos</th>
                <th className="py-4 px-6 text-center">Laps</th>
                <th className="py-4 px-6 text-right">Best Lap</th>
                <th className="py-4 px-6 text-right">Total Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300">
              {results.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/35 transition-colors duration-150">
                  <td className="py-4 px-6">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mb-1 ${
                      row.sessions?.session_type === 'Race' ? 'bg-violet-950/40 text-violet-400 border border-violet-900/40' :
                      row.sessions?.session_type === 'Qualifying' ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/40' :
                      'bg-slate-950/40 text-slate-400 border border-slate-900'
                    }`}>
                      {row.sessions?.session_type}
                    </span>
                    <div className="text-xs font-bold capitalize text-slate-200">{row.sessions?.track_name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{row.sessions?.session_date}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold tracking-wide flex items-center space-x-1.5">
                      <span>{row.drivers?.first_name} {row.drivers?.last_name}</span>
                      {row.nationalities && (
                        <span className="text-xs grayscale opacity-75" title={row.nationalities.country_name}>
                          {row.nationalities.iso_alpha2}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide flex items-center space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: row.teams?.color || '#cbd5e1' }}></div>
                      <span>{row.teams?.name || 'Independent'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-xs font-semibold">{row.car_models?.name || `Car Type ${row.car_model_id}`}</div>
                    <span className="text-[9px] font-bold px-1 rounded bg-slate-900 text-slate-500">
                      {row.car_models?.class || 'GT3'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {row.dnf ? (
                      <span className="text-xs font-bold text-rose-500">DNF</span>
                    ) : row.dns ? (
                      <span className="text-xs font-bold text-slate-500">DNS</span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">{row.position_raw || '-'}</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center font-semibold text-slate-300">{row.laps_completed}</td>
                  <td className={`py-4 px-6 text-right font-mono text-xs ${row.is_fastest_lap ? 'text-emerald-400 font-bold glow-accent-emerald' : 'text-slate-300'}`}>
                    {formatMs(row.best_lap_time_ms)}
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-xs text-slate-400">
                    {formatMs(row.total_time_ms)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
