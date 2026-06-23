import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Lock, Mail, Settings, Edit3, ShieldAlert, CheckCircle, RefreshCw, PlusCircle, Trash2 } from 'lucide-react';

export default function AdminPortal({ session, setSession }) {
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Panel active section: 'config' | 'reference' | 'penalties'
  const [activeAdminTab, setActiveAdminTab] = useState('config');

  // Success / Error alerts for forms
  const [formStatus, setFormStatus] = useState({ success: null, error: null });

  // Settings states
  const [settings, setSettings] = useState({
    active_drop_weeks: 0,
    min_lap_threshold: 1,
    points_scale: '25,18,15,12,10,8,6,4,2,1',
    fastest_lap_bonus: 1,
    team_scoring_top_n: 2
  });

  // Reference Editor states
  const [carList, setCarList] = useState([]);
  const [natList, setNatList] = useState([]);
  const [newCar, setNewCar] = useState({ id: '', name: '', class: 'GT3' });
  const [newNat, setNewNat] = useState({ id: '', country_name: '', iso_alpha2: '' });

  // Steward Penalty states
  const [sessionsList, setSessionsList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [penaltyTypes, setPenaltyTypes] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedPenaltyTypeId, setSelectedPenaltyTypeId] = useState('');
  const [appliedValue, setAppliedValue] = useState(0);
  const [penaltyUnit, setPenaltyUnit] = useState('seconds');
  const [appliesToNextRace, setAppliesToNextRace] = useState(false);
  const [penaltyReason, setPenaltyReason] = useState('');
  const [issuedBy, setIssuedBy] = useState('');

  useEffect(() => {
    if (session) {
      fetchSettings();
      fetchReferenceData();
      fetchStewardFormDropdowns();
    }
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoginLoading(true);
      setLoginError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setSession(data.session);
    } catch (err) {
      console.error('Login error:', err);
      setLoginError(err.message || 'Invalid login credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('league_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) throw error;
      if (data) {
        setSettings({
          active_drop_weeks: data.active_drop_weeks,
          min_lap_threshold: data.min_lap_threshold,
          points_scale: Array.isArray(data.points_scale) ? data.points_scale.join(',') : data.points_scale,
          fastest_lap_bonus: data.fastest_lap_bonus,
          team_scoring_top_n: data.team_scoring_top_n
        });
      }
    } catch (err) {
      console.warn('Failed to load settings from DB:', err);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const { data: cars } = await supabase.from('car_models').select('*').order('name');
      const { data: nats } = await supabase.from('nationalities').select('*').order('country_name');
      if (cars) setCarList(cars);
      if (nats) setNatList(nats);
    } catch (err) {
      console.warn('Reference query failed:', err);
    }
  };

  const fetchStewardFormDropdowns = async () => {
    try {
      // Get all active sessions
      const { data: ses } = await supabase
        .from('sessions')
        .select('id, track_name, session_type, session_date')
        .order('session_date', { ascending: false });

      // Get drivers
      const { data: drvs } = await supabase
        .from('drivers')
        .select('id, first_name, last_name')
        .order('last_name');

      // Get penalty types catalog
      const { data: pTypes } = await supabase
        .from('penalty_types')
        .select('*');

      if (ses) {
        setSessionsList(ses);
        if (ses.length > 0) setSelectedSessionId(ses[0].id);
      }
      if (drvs) {
        setDriversList(drvs);
        if (drvs.length > 0) setSelectedDriverId(drvs[0].id);
      }
      if (pTypes) {
        setPenaltyTypes(pTypes);
        if (pTypes.length > 0) {
          setSelectedPenaltyTypeId(pTypes[0].id);
          setAppliedValue(pTypes[0].default_value);
          setPenaltyUnit(pTypes[0].unit);
        }
      }
    } catch (err) {
      console.warn('Failed to load steward dropdowns:', err);
    }
  };

  // Penalty type selection update default values
  const handlePenaltyTypeChange = (typeId) => {
    setSelectedPenaltyTypeId(typeId);
    const pType = penaltyTypes.find(pt => pt.id === parseInt(typeId));
    if (pType) {
      setAppliedValue(pType.default_value);
      setPenaltyUnit(pType.unit);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      setFormStatus({ success: null, error: null });
      // Format points_scale back to array
      const pointsArray = settings.points_scale.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      
      const updateData = {
        active_drop_weeks: parseInt(settings.active_drop_weeks),
        min_lap_threshold: parseInt(settings.min_lap_threshold),
        points_scale: pointsArray,
        fastest_lap_bonus: parseInt(settings.fastest_lap_bonus),
        team_scoring_top_n: parseInt(settings.team_scoring_top_n)
      };

      const { error } = await supabase
        .from('league_settings')
        .update(updateData)
        .eq('id', 1);

      if (error) throw error;
      setFormStatus({ success: 'League settings successfully updated in Supabase.', error: null });
    } catch (err) {
      console.error(err);
      setFormStatus({ success: null, error: err.message || 'Error updating settings.' });
    }
  };

  const handleAddCar = async (e) => {
    e.preventDefault();
    try {
      setFormStatus({ success: null, error: null });
      const { error } = await supabase
        .from('car_models')
        .insert({
          id: parseInt(newCar.id),
          name: newCar.name,
          class: newCar.class
        });

      if (error) throw error;
      setNewCar({ id: '', name: '', class: 'GT3' });
      fetchReferenceData();
      setFormStatus({ success: 'Car model added successfully.', error: null });
    } catch (err) {
      setFormStatus({ success: null, error: err.message || 'Failed to add car model.' });
    }
  };

  const handleAddNat = async (e) => {
    e.preventDefault();
    try {
      setFormStatus({ success: null, error: null });
      const { error } = await supabase
        .from('nationalities')
        .insert({
          id: parseInt(newNat.id),
          country_name: newNat.country_name,
          iso_alpha2: newNat.iso_alpha2
        });

      if (error) throw error;
      setNewNat({ id: '', country_name: '', iso_alpha2: '' });
      fetchReferenceData();
      setFormStatus({ success: 'Nationality added successfully.', error: null });
    } catch (err) {
      setFormStatus({ success: null, error: err.message || 'Failed to add nationality.' });
    }
  };

  const handleLogPenalty = async (e) => {
    e.preventDefault();
    try {
      setFormStatus({ success: null, error: null });

      if (!selectedSessionId || !selectedDriverId) {
        throw new Error('Please select a valid session and driver.');
      }

      // 1. Find the corresponding row in session_results by session_id and driver_id
      const { data: resRow, error: resError } = await supabase
        .from('session_results')
        .select('id')
        .eq('session_id', selectedSessionId)
        .eq('driver_id', selectedDriverId)
        .single();

      if (resError || !resRow) {
        throw new Error('Could not find a results row for this driver in the selected session. Ensure the session telemetry is ingested first.');
      }

      // 2. Insert the penalty record
      const penaltyData = {
        session_result_id: resRow.id,
        penalty_type_id: parseInt(selectedPenaltyTypeId),
        applied_value: parseFloat(appliedValue),
        unit: penaltyUnit,
        applies_to_next_race: appliesToNextRace,
        reason: penaltyReason,
        issued_by: issuedBy
      };

      const { error: insError } = await supabase
        .from('penalties')
        .insert(penaltyData);

      if (insError) throw insError;

      // Reset Form
      setPenaltyReason('');
      setFormStatus({ success: 'Penalty successfully logged in database. Standings re-computed automatically.', error: null });
    } catch (err) {
      console.error(err);
      setFormStatus({ success: null, error: err.message || 'Failed to log penalty.' });
    }
  };

  // If session does not exist, render Auth screen
  if (!session) {
    return (
      <div className="max-w-md mx-auto my-12 glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/30">
            <Lock className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Steward Authentication</h2>
            <p className="text-slate-400 text-xs mt-1">
              Authorized credentials required to issue penalties and edit configuration.
            </p>
          </div>
        </div>

        {loginError && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="steward@accsimleague.com"
                className="w-full glass-input rounded-lg pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Steward Code</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input rounded-lg pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-2.5 rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 text-white text-sm transition-all duration-150 flex items-center justify-center space-x-2 shadow-lg shadow-violet-600/35"
          >
            {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Sign In to Portal</span>}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 glass-panel rounded-2xl shadow-2xl">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 glow-accent-emerald" /> STEWARD COMMAND CENTER
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure championship settings, update Reference lists, and issue penalties.
          </p>
        </div>
      </div>

      {formStatus.success && (
        <div className="flex items-center space-x-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{formStatus.success}</span>
        </div>
      )}

      {formStatus.error && (
        <div className="flex items-center space-x-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>{formStatus.error}</span>
        </div>
      )}

      {/* Admin navigation tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => { setActiveAdminTab('config'); setFormStatus({ success: null, error: null }); }}
          className={`flex items-center space-x-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeAdminTab === 'config' ? 'border-violet-500 text-violet-400 glow-accent' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>League Settings</span>
        </button>
        <button
          onClick={() => { setActiveAdminTab('reference'); setFormStatus({ success: null, error: null }); }}
          className={`flex items-center space-x-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeAdminTab === 'reference' ? 'border-violet-500 text-violet-400 glow-accent' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Reference Catalog</span>
        </button>
        <button
          onClick={() => { setActiveAdminTab('penalties'); setFormStatus({ success: null, error: null }); }}
          className={`flex items-center space-x-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeAdminTab === 'penalties' ? 'border-violet-500 text-violet-400 glow-accent' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Log Penalty</span>
        </button>
      </div>

      {/* Settings Tab Form */}
      {activeAdminTab === 'config' && (
        <div className="max-w-2xl glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-lg">
          <h2 className="text-lg font-bold text-slate-200 mb-4">League Settings Configuration</h2>
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Active Drop Weeks</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.active_drop_weeks}
                  onChange={(e) => setSettings({ ...settings, active_drop_weeks: e.target.value })}
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Minimum Lap Threshold</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.min_lap_threshold}
                  onChange={(e) => setSettings({ ...settings, min_lap_threshold: e.target.value })}
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Fastest Lap Bonus Points</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.fastest_lap_bonus}
                  onChange={(e) => setSettings({ ...settings, fastest_lap_bonus: e.target.value })}
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Team Scoring Cap (Top N)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={settings.team_scoring_top_n}
                  onChange={(e) => setSettings({ ...settings, team_scoring_top_n: e.target.value })}
                  className="w-full glass-input rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                Points Scale (F1 Scale - comma separated positions P1..P10)
              </label>
              <input
                type="text"
                required
                value={settings.points_scale}
                onChange={(e) => setSettings({ ...settings, points_scale: e.target.value })}
                className="w-full glass-input rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 text-white text-xs transition-colors flex items-center space-x-1 shadow-lg shadow-violet-600/20"
            >
              <span>Save League Config</span>
            </button>
          </form>
        </div>
      )}

      {/* Reference Catalog Tab */}
      {activeAdminTab === 'reference' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Car Models */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-violet-400" /> Add Car Model
            </h2>
            <form onSubmit={handleAddCar} className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Car ID</label>
                  <input
                    type="number"
                    required
                    value={newCar.id}
                    onChange={(e) => setNewCar({ ...newCar, id: e.target.value })}
                    placeholder="32"
                    className="w-full glass-input rounded-lg px-2.5 py-2 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Class</label>
                  <select
                    value={newCar.class}
                    onChange={(e) => setNewCar({ ...newCar, class: e.target.value })}
                    className="w-full glass-input rounded-lg px-2.5 py-2 text-xs"
                  >
                    <option value="GT3">GT3</option>
                    <option value="GT4">GT4</option>
                    <option value="GTC">GTC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Car Model Name</label>
                <input
                  type="text"
                  required
                  value={newCar.name}
                  onChange={(e) => setNewCar({ ...newCar, name: e.target.value })}
                  placeholder="Ferrari 296 GT3"
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 text-white text-[11px] transition-colors"
              >
                Insert Car Model
              </button>
            </form>
          </div>

          {/* Nationalities */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-violet-400" /> Add Driver Nationality
            </h2>
            <form onSubmit={handleAddNat} className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Nat ID</label>
                  <input
                    type="number"
                    required
                    value={newNat.id}
                    onChange={(e) => setNewNat({ ...newNat, id: e.target.value })}
                    placeholder="19"
                    className="w-full glass-input rounded-lg px-2.5 py-2 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">ISO code (Alpha2)</label>
                  <input
                    type="text"
                    required
                    maxLength="2"
                    value={newNat.iso_alpha2}
                    onChange={(e) => setNewNat({ ...newNat, iso_alpha2: e.target.value })}
                    placeholder="PR"
                    className="w-full glass-input rounded-lg px-2.5 py-2 text-xs uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Country Name</label>
                <input
                  type="text"
                  required
                  value={newNat.country_name}
                  onChange={(e) => setNewNat({ ...newNat, country_name: e.target.value })}
                  placeholder="Puerto Rico"
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-semibold bg-violet-600 hover:bg-violet-500 text-white text-[11px] transition-colors"
              >
                Insert Nationality
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Log Penalty Tab Form */}
      {activeAdminTab === 'penalties' && (
        <div className="max-w-2xl glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-lg">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-1">
            <ShieldAlert className="w-5 h-5 text-rose-500" /> Log Steward Decision & Penalty
          </h2>
          <form onSubmit={handleLogPenalty} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Select Session</label>
                <select
                  required
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs cursor-pointer capitalize"
                >
                  <option value="">-- Select Session --</option>
                  {sessionsList.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-950 capitalize">
                      {s.track_name} ({s.session_type}) — {s.session_date}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Select Driver</label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs cursor-pointer"
                >
                  <option value="">-- Select Driver --</option>
                  {driversList.map(d => (
                    <option key={d.id} value={d.id} className="bg-slate-950">
                      {d.first_name} {d.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Select Penalty Type</label>
                <select
                  required
                  value={selectedPenaltyTypeId}
                  onChange={(e) => handlePenaltyTypeChange(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs cursor-pointer"
                >
                  {penaltyTypes.map(pt => (
                    <option key={pt.id} value={pt.id} className="bg-slate-950">
                      {pt.name} (Default: +{pt.default_value} {pt.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Applies to Next Race?</label>
                <div className="flex items-center h-9">
                  <input
                    type="checkbox"
                    id="nextRaceCheck"
                    checked={appliesToNextRace}
                    onChange={(e) => setAppliesToNextRace(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 accent-rose-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="nextRaceCheck" className="ml-2 text-xs text-slate-400 font-semibold cursor-pointer">
                    DQ Carryover
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Applied Penalty Value</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={appliedValue}
                  onChange={(e) => setAppliedValue(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Penalty Unit</label>
                <select
                  value={penaltyUnit}
                  onChange={(e) => setPenaltyUnit(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs"
                >
                  <option value="seconds">Seconds Added</option>
                  <option value="laps">Laps Deducted</option>
                  <option value="disqualification">Disqualification</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Steward Findings / Notes</label>
              <textarea
                required
                rows="3"
                value={penaltyReason}
                onChange={(e) => setPenaltyReason(e.target.value)}
                placeholder="Driver missed braking point at T1 and made heavy contact with..."
                className="w-full glass-input rounded-lg px-3 py-2 text-xs resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Issuing Steward</label>
              <input
                type="text"
                required
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                placeholder="Steward Officer Chief"
                className="w-full glass-input rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg font-semibold bg-rose-600 hover:bg-rose-500 text-white text-xs transition-colors flex items-center space-x-1.5 shadow-lg shadow-rose-600/30"
            >
              <span>Publish Steward Ruling</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
