import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { BarChart3, AlertCircle, TrendingUp, HelpCircle } from 'lucide-react';

export default function Dashboards() {
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedDriverA, setSelectedDriverA] = useState('');
  const [selectedDriverB, setSelectedDriverB] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');

  const [comparisonData, setComparisonData] = useState([]);
  const [teamTimelineData, setTeamTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    if (selectedDriverA && selectedDriverB) {
      loadComparison();
    }
  }, [selectedDriverA, selectedDriverB]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamTimeline();
    }
  }, [selectedTeam]);

  const fetchMeta = async () => {
    try {
      setLoading(true);
      // Fetch drivers
      const { data: dList } = await supabase.from('drivers').select('id, first_name, last_name');
      // Fetch teams
      const { data: tList } = await supabase.from('teams').select('id, name');

      if (dList && dList.length > 0) {
        setDrivers(dList);
        setSelectedDriverA(dList[0].id);
        setSelectedDriverB(dList[1]?.id || dList[0].id);
      } else {
        // Mock fallback list
        const mockD = [
          { id: 'd1', first_name: 'Max', last_name: 'Verstappen' },
          { id: 'd2', first_name: 'Charles', last_name: 'Leclerc' },
          { id: 'd3', first_name: 'Lando', last_name: 'Norris' }
        ];
        setDrivers(mockD);
        setSelectedDriverA('d1');
        setSelectedDriverB('d2');
      }

      if (tList && tList.length > 0) {
        setTeams(tList);
        setSelectedTeam(tList[0].id);
      } else {
        const mockT = [
          { id: 't1', name: 'Red Bull Racing' },
          { id: 't2', name: 'Ferrari Simracing' },
          { id: 't3', name: 'McLaren Shadow' }
        ];
        setTeams(mockT);
        setSelectedTeam('t1');
      }
    } catch (err) {
      console.warn('Error loading meta filters, loading mock fallbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    // Generate comparison data: Position of Driver A vs Driver B over recent rounds
    // We will query `v_race_detail` for driver results
    try {
      const { data: resultsA } = await supabase
        .from('v_race_detail')
        .select('round_number, race_position')
        .eq('driver_id', selectedDriverA)
        .order('round_number');

      const { data: resultsB } = await supabase
        .from('v_race_detail')
        .select('round_number, race_position')
        .eq('driver_id', selectedDriverB)
        .order('round_number');

      if (resultsA && resultsA.length > 0) {
        // Map together by round
        const rounds = Array.from(new Set([...resultsA.map(r => r.round_number), ...resultsB.map(r => r.round_number)]));
        const combined = rounds.map(rnd => {
          const rA = resultsA.find(r => r.round_number === rnd);
          const rB = resultsB.find(r => r.round_number === rnd);
          return {
            round: `Round ${rnd}`,
            [selectedDriverA]: rA ? rA.race_position : null,
            [selectedDriverB]: rB ? rB.race_position : null
          };
        });
        setComparisonData(combined);
      } else {
        loadMockComparison();
      }
    } catch (err) {
      loadMockComparison();
    }
  };

  const loadMockComparison = () => {
    // Hardcoded mock head-to-head positions
    setComparisonData([
      { round: 'Round 1', 'Verstappen': 1, 'Leclerc': 2, 'Norris': 4 },
      { round: 'Round 2', 'Verstappen': 2, 'Leclerc': 1, 'Norris': 3 },
      { round: 'Round 3', 'Verstappen': 1, 'Leclerc': 4, 'Norris': 2 },
      { round: 'Round 4', 'Verstappen': 1, 'Leclerc': 2, 'Norris': 5 },
      { round: 'Round 5', 'Verstappen': 5, 'Leclerc': 3, 'Norris': 1 },
      { round: 'Round 6', 'Verstappen': 2, 'Leclerc': 1, 'Norris': 4 }
    ]);
  };

  const loadTeamTimeline = async () => {
    // Fetch timeline of team points accumulated per race
    try {
      const { data } = await supabase
        .from('v_race_classification')
        .select('round_number, total_points')
        .eq('team_id', selectedTeam)
        .order('round_number');

      if (data && data.length > 0) {
        // Accumulate points
        let runningTotal = 0;
        const timeline = data.map(r => {
          runningTotal += r.total_points;
          return {
            round: `Round ${r.round_number}`,
            points: runningTotal,
            roundPoints: r.total_points
          };
        });
        setTeamTimelineData(timeline);
      } else {
        loadMockTeamTimeline();
      }
    } catch (err) {
      loadMockTeamTimeline();
    }
  };

  const loadMockTeamTimeline = () => {
    const mockTimelines = {
      't1': [
        { round: 'Round 1', points: 37, roundPoints: 37 },
        { round: 'Round 2', points: 62, roundPoints: 25 },
        { round: 'Round 3', points: 99, roundPoints: 37 },
        { round: 'Round 4', points: 139, roundPoints: 40 },
        { round: 'Round 5', points: 154, roundPoints: 15 },
        { round: 'Round 6', points: 198, roundPoints: 44 }
      ],
      't2': [
        { round: 'Round 1', points: 28, roundPoints: 28 },
        { round: 'Round 2', points: 61, roundPoints: 33 },
        { round: 'Round 3', points: 79, roundPoints: 18 },
        { round: 'Round 4', points: 112, roundPoints: 33 },
        { round: 'Round 5', points: 137, roundPoints: 25 },
        { round: 'Round 6', points: 165, roundPoints: 28 }
      ],
      't3': [
        { round: 'Round 1', points: 15, roundPoints: 15 },
        { round: 'Round 2', points: 30, roundPoints: 15 },
        { round: 'Round 3', points: 55, roundPoints: 25 },
        { round: 'Round 4', points: 73, roundPoints: 18 },
        { round: 'Round 5', points: 108, roundPoints: 35 },
        { round: 'Round 6', points: 144, roundPoints: 36 }
      ]
    };

    setTeamTimelineData(mockTimelines[selectedTeam] || mockTimelines['t1']);
  };

  const getDriverName = (id) => {
    const d = drivers.find(drv => drv.id === id);
    return d ? `${d.first_name} ${d.last_name}` : id;
  };

  const getTeamName = (id) => {
    const t = teams.find(team => team.id === id);
    return t ? t.name : id;
  };

  // Custom tooltips to match our dark theme
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel-heavy p-3 rounded-lg border border-slate-800 shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-300">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }} className="font-medium">
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 glass-panel rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-violet-400 glow-accent" /> ANALYTICS & DASHBOARDS
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Compare driver finishing trends and track constructor championship point progress over time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Head-to-Head Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" /> Driver Finishing Positions
            </h2>
            
            {/* Pickers */}
            <div className="flex space-x-2">
              <select
                value={selectedDriverA}
                onChange={(e) => setSelectedDriverA(e.target.value)}
                className="glass-input rounded-md px-2.5 py-1.5 text-xs font-semibold"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-950 text-white">
                    {d.first_name} {d.last_name[0]}.
                  </option>
                ))}
              </select>
              <span className="text-slate-600 font-bold self-center text-xs">VS</span>
              <select
                value={selectedDriverB}
                onChange={(e) => setSelectedDriverB(e.target.value)}
                className="glass-input rounded-md px-2.5 py-1.5 text-xs font-semibold"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-950 text-white">
                    {d.first_name} {d.last_name[0]}.
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="round" stroke="#64748b" style={{ fontSize: '10px' }} />
                {/* We reverse the Y Axis because position 1 is better than 10 */}
                <YAxis reversed domain={[1, 'dataMax + 1']} stroke="#64748b" style={{ fontSize: '10px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Line
                  name={getDriverName(selectedDriverA)}
                  type="monotone"
                  dataKey={selectedDriverA}
                  stroke="#a78bfa"
                  strokeWidth={3}
                  dot={{ r: 4, stroke: '#a78bfa', strokeWidth: 1, fill: '#0f172a' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  name={getDriverName(selectedDriverB)}
                  type="monotone"
                  dataKey={selectedDriverB}
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{ r: 4, stroke: '#60a5fa', strokeWidth: 1, fill: '#0f172a' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 italic mt-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Lower values reflect better finishing positions (e.g., P1 is top of chart).</span>
          </div>
        </div>

        {/* Team Accumulation Timeline Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" /> Team Point Accumulation
            </h2>
            
            {/* Picker */}
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="glass-input rounded-md px-2.5 py-1.5 text-xs font-semibold self-start sm:self-auto"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-950 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={teamTimelineData}>
                <defs>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="round" stroke="#64748b" style={{ fontSize: '10px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  name={`${getTeamName(selectedTeam)} Standings`}
                  type="monotone"
                  dataKey="points"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPoints)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 italic mt-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Cumulative points earned by the team across all season rounds.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
