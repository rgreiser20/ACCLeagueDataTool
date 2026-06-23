import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldAlert, AlertTriangle, User, RefreshCw, Scale } from 'lucide-react';

export default function PenaltyLog() {
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPenalties();
  }, []);

  const fetchPenalties = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryErr } = await supabase
        .from('penalties')
        .select(`
          id,
          applied_value,
          unit,
          reason,
          issued_by,
          issued_at,
          applies_to_next_race,
          penalty_types (
            name,
            default_value,
            unit
          ),
          session_results (
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
            sessions (
              track_name,
              session_date,
              session_type
            )
          )
        `)
        .order('issued_at', { ascending: false });

      if (queryErr) throw queryErr;
      setPenalties(data || []);
    } catch (err) {
      console.warn('DB query failed, loading mock penalty logs:', err);
      setError('Database connection error. Displaying preview mock data.');
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setPenalties([
      {
        id: 'p1',
        applied_value: 30,
        unit: 'seconds',
        reason: 'Caused avoidable collision at Turn 1 at the start.',
        issued_by: 'Steward Chief John',
        issued_at: '2026-06-22T22:45:00Z',
        applies_to_next_race: false,
        penalty_types: { name: 'Minor collision' },
        session_results: {
          drivers: { first_name: 'Lewis', last_name: 'Hamilton', steam_id: '76561198000000004' },
          teams: { name: 'Mercedes Simracing', abbreviation: 'MER', color: '#00d2be' },
          sessions: { track_name: 'monza', session_type: 'Race', session_date: '2026-06-22' }
        }
      },
      {
        id: 'p2',
        applied_value: 1,
        unit: 'laps',
        reason: 'Failed to complete mandatory pitstop window before pit entry closed.',
        issued_by: 'Steward Deputy Sarah',
        issued_at: '2026-06-22T22:50:00Z',
        applies_to_next_race: false,
        penalty_types: { name: 'Missed pit' },
        session_results: {
          drivers: { first_name: 'George', last_name: 'Russell', steam_id: '76561198000000005' },
          teams: { name: 'Mercedes Simracing', abbreviation: 'MER', color: '#00d2be' },
          sessions: { track_name: 'monza', session_type: 'Race', session_date: '2026-06-22' }
        }
      },
      {
        id: 'p3',
        applied_value: 0,
        unit: 'disqualification',
        reason: 'Aggressive weaving and intentional wrecking under safety car conditions.',
        issued_by: 'Steward Chief John',
        issued_at: '2026-06-18T19:30:00Z',
        applies_to_next_race: true,
        penalty_types: { name: 'Malicious wrecking' },
        session_results: {
          drivers: { first_name: 'Jane', last_name: 'Smith', steam_id: '76561198000000002' },
          teams: { name: 'M4 Racing', abbreviation: 'M4R', color: '#e2e8f0' },
          sessions: { track_name: 'spa', session_type: 'Race', session_date: '2026-06-18' }
        }
      }
    ]);
  };

  const getPenaltyBadgeClass = (unit) => {
    if (unit === 'disqualification') return 'bg-rose-950/40 text-rose-400 border border-rose-900/40';
    if (unit === 'laps') return 'bg-amber-950/40 text-amber-400 border border-amber-900/30';
    return 'bg-slate-900 text-slate-400 border border-slate-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 glass-panel rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
          <Scale className="w-8 h-8 text-rose-400 glow-accent" /> STEWARD PENALTY LEDGER
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Transparency board of all penalties issued by league stewards. Stands as the official ledger.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
          <span className="text-slate-400 text-sm">Querying steward ledger...</span>
        </div>
      ) : penalties.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-xl">
          <Scale className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">Steward ledger is currently clean.</p>
          <p className="text-slate-600 text-xs mt-1">No infractions have been logged.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-left border-collapse glass-panel">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Date / Event</th>
                <th className="py-4 px-6">Driver & Team</th>
                <th className="py-4 px-6">Infraction Type</th>
                <th className="py-4 px-6 text-center">Applied Penalty</th>
                <th className="py-4 px-6">Steward Findings / Notes</th>
                <th className="py-4 px-6">Issued By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300 text-xs">
              {penalties.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/35 transition-colors duration-150">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-200 capitalize">
                      {row.session_results?.sessions?.track_name} ({row.session_results?.sessions?.session_type})
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">
                      Session: {row.session_results?.sessions?.session_date}
                    </div>
                    <div className="text-[9px] text-slate-500 font-medium">
                      Logged: {new Date(row.issued_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-200">
                      {row.session_results?.drivers?.first_name} {row.session_results?.drivers?.last_name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: row.session_results?.teams?.color || '#cbd5e1' }}></div>
                      <span>{row.session_results?.teams?.name || 'Independent'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-200">
                    <div className="flex items-center space-x-1.5 text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>{row.penalty_types?.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getPenaltyBadgeClass(row.unit)}`}>
                      {row.unit === 'disqualification' ? (
                        <span>DQ{row.applies_to_next_race && <span className="block text-[8px] tracking-tight">+Next Race</span>}</span>
                      ) : (
                        <span>+{row.applied_value} {row.unit}</span>
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-300 italic max-w-sm">
                    "{row.reason || 'No specific findings logged.'}"
                  </td>
                  <td className="py-4 px-6 text-slate-400 font-medium flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>{row.issued_by || 'Unknown Steward'}</span>
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
