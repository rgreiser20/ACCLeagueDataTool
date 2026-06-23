import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trophy, Users, ShieldAlert, Award, Calendar, RefreshCw } from 'lucide-react';

export default function PublicLeaderboard() {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [driverStandings, setDriverStandings] = useState([]);
  const [teamStandings, setTeamStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('drivers'); // 'drivers' or 'teams'
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchStandings(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setSeasons(data);
        // Default to active season, or the first season
        const active = data.find(s => s.is_active) || data[0];
        setSelectedSeasonId(active.id);
      } else {
        // Fallback mock seasons
        const mockSeasons = [
          { id: 'mock-season-1', name: 'Championship Season 2026', year: 2026, is_active: true }
        ];
        setSeasons(mockSeasons);
        setSelectedSeasonId('mock-season-1');
      }
    } catch (err) {
      console.error('Error fetching seasons:', err);
      // Fallback
      setSeasons([{ id: 'mock-season-1', name: 'Championship Season 2026', year: 2026, is_active: true }]);
      setSelectedSeasonId('mock-season-1');
    }
  };

  const fetchStandings = async (seasonId) => {
    try {
      setLoading(true);
      setError(null);

      // Check if we are using mock season
      if (seasonId === 'mock-season-1') {
        loadMockData();
        setLoading(false);
        return;
      }

      // Fetch drivers
      const { data: drivers, error: dError } = await supabase
        .from('v_driver_championship')
        .select('*')
        .eq('season_id', seasonId);

      if (dError) throw dError;

      // Fetch teams
      const { data: teams, error: tError } = await supabase
        .from('v_team_championship')
        .select('*')
        .eq('season_id', seasonId);

      if (tError) throw tError;

      setDriverStandings(drivers || []);
      setTeamStandings(teams || []);
    } catch (err) {
      console.warn('DB Fetch failed, loading mock fallback data:', err);
      setError('Database connection error. Displaying preview mock data.');
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setDriverStandings([
      {
        championship_position: 1,
        first_name: 'Max',
        last_name: 'Verstappen',
        steam_id: '76561198000000001',
        championship_points: 118,
        total_points_gross: 143,
        races_counted: 5,
        drop_count: 1,
        total_races: 6
      },
      {
        championship_position: 2,
        first_name: 'Charles',
        last_name: 'Leclerc',
        steam_id: '76561198000000002',
        championship_points: 98,
        total_points_gross: 110,
        races_counted: 5,
        drop_count: 1,
        total_races: 6
      },
      {
        championship_position: 3,
        first_name: 'Lando',
        last_name: 'Norris',
        steam_id: '76561198000000003',
        championship_points: 85,
        total_points_gross: 85,
        races_counted: 5,
        drop_count: 1,
        total_races: 6
      },
      {
        championship_position: 4,
        first_name: 'Lewis',
        last_name: 'Hamilton',
        steam_id: '76561198000000004',
        championship_points: 62,
        total_points_gross: 68,
        races_counted: 5,
        drop_count: 1,
        total_races: 6
      },
      {
        championship_position: 5,
        first_name: 'George',
        last_name: 'Russell',
        steam_id: '76561198000000005',
        championship_points: 58,
        total_points_gross: 58,
        races_counted: 5,
        drop_count: 1,
        total_races: 6
      }
    ]);

    setTeamStandings([
      {
        championship_position: 1,
        team_name: 'Red Bull Racing',
        team_abbreviation: 'RBR',
        team_color: '#0600ef',
        championship_points: 198,
        total_points_gross: 218,
        races_counted: 5,
        drop_count: 1,
        total_races: 6
      },
      {
        championship_position: 2,
        team_name: 'Ferrari Simracing',
        team_abbreviation: 'SCR',
        team_color: '#ff0000',
        championship_points: 165,
        total_points_gross: 180,
        races_counted: 5,
        drop_count: 1,
        total_races: 6
      },
      {
        championship_position: 3,
        team_name: 'McLaren Shadow',
        team_abbreviation: 'MCL',
        team_color: '#ff8700',
        championship_points: 144,
        total_points_gross: 144,
        races_counted: 5,
        drop_count: 1,
        total_races: 6
      }
    ]);
  };

  const getPodiumClass = (pos) => {
    if (pos === 1) return 'gold-glow border border-amber-500/40 bg-amber-500/10 text-amber-300';
    if (pos === 2) return 'silver-glow border border-slate-400/40 bg-slate-400/10 text-slate-300';
    if (pos === 3) return 'bronze-glow border border-amber-700/40 bg-amber-700/10 text-amber-500';
    return 'border border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800/40';
  };

  const getPodiumBadge = (pos) => {
    if (pos === 1) return <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase shadow-lg shadow-amber-500/20"><Award className="w-3 h-3" /> <span>Winner</span></span>;
    if (pos === 2) return <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-400 text-slate-950 uppercase"><Award className="w-3 h-3" /> <span>P2</span></span>;
    if (pos === 3) return <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-800 text-slate-100 uppercase"><Award className="w-3 h-3" /> <span>P3</span></span>;
    return <span className="text-slate-500 font-semibold">P{pos}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-panel rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
            <Trophy className="w-8 h-8 text-violet-400 glow-accent" /> ACC LEAGUE STANDINGS
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dynamic standings calculated in real-time, including drop weeks and active penalties.
          </p>
        </div>

        {/* Season Selector */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-violet-400" />
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="glass-input rounded-lg px-4 py-2 text-sm pr-8 font-medium cursor-pointer"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-950 text-white">
                {s.name} ({s.year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800/80 pb-px">
        <button
          onClick={() => setActiveSubTab('drivers')}
          className={`flex items-center space-x-2 px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 ${
            activeSubTab === 'drivers'
              ? 'border-violet-500 text-violet-400 glow-accent'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Driver Standings</span>
        </button>
        <button
          onClick={() => setActiveSubTab('teams')}
          className={`flex items-center space-x-2 px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 ${
            activeSubTab === 'teams'
              ? 'border-violet-500 text-violet-400 glow-accent'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Standings</span>
        </button>
      </div>

      {/* Main Tables */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
          <span className="text-slate-400 text-sm">Computing championship standings...</span>
        </div>
      ) : activeSubTab === 'drivers' ? (
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Pos</th>
                <th className="py-4 px-6">Driver</th>
                <th className="py-4 px-6 text-center">Races</th>
                <th className="py-4 px-6 text-center">Drops Used</th>
                <th className="py-4 px-6 text-right">Gross Points</th>
                <th className="py-4 px-6 text-right text-violet-400 font-bold">Championship Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {driverStandings.map((row) => {
                const isPodium = row.championship_position <= 3;
                return (
                  <tr
                    key={row.driver_id}
                    className={`transition-colors duration-150 ${getPodiumClass(row.championship_position)}`}
                  >
                    <td className="py-4 px-6 font-bold">
                      <div className="flex items-center space-x-2">
                        {getPodiumBadge(row.championship_position)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold tracking-wide">
                        {row.first_name} {row.last_name}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Steam ID: {row.steam_id}</span>
                    </td>
                    <td className="py-4 px-6 text-center text-slate-300 font-medium">{row.total_races}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.drop_count > 0 ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' : 'bg-slate-950/40 text-slate-500 border border-slate-900'
                      }`}>
                        {row.drop_count}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-slate-400 font-medium">{row.total_points_gross}</td>
                    <td className="py-4 px-6 text-right text-base font-extrabold text-violet-400 glow-accent">
                      {row.championship_points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-6">Pos</th>
                <th className="py-4 px-6">Team Name</th>
                <th className="py-4 px-6 text-center">Races</th>
                <th className="py-4 px-6 text-center">Drops Used</th>
                <th className="py-4 px-6 text-right">Gross Points</th>
                <th className="py-4 px-6 text-right text-violet-400 font-bold">Championship Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {teamStandings.map((row) => {
                const isPodium = row.championship_position <= 3;
                return (
                  <tr
                    key={row.team_id}
                    className={`transition-colors duration-150 ${getPodiumClass(row.championship_position)}`}
                  >
                    <td className="py-4 px-6 font-bold">
                      <div className="flex items-center space-x-2">
                        {getPodiumBadge(row.championship_position)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2.5">
                        {/* Custom team color border */}
                        <div
                          className="w-1.5 h-7 rounded"
                          style={{ backgroundColor: row.team_color || '#a78bfa' }}
                        ></div>
                        <div>
                          <div className="font-semibold tracking-wide">{row.team_name}</div>
                          <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                            {row.team_abbreviation || 'TEAM'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center text-slate-300 font-medium">{row.total_races}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.drop_count > 0 ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' : 'bg-slate-950/40 text-slate-500 border border-slate-900'
                      }`}>
                        {row.drop_count}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-slate-400 font-medium">{row.total_points_gross}</td>
                    <td className="py-4 px-6 text-right text-base font-extrabold text-violet-400 glow-accent">
                      {row.championship_points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
