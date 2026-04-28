import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const HOME_SUPABASE_URL = 'https://phicbgmciqrfeuwbnlrv.supabase.co';
const HOME_SUPABASE_KEY = 'sb_publishable_KsP-lQCVJyafRSMlN_5h2Q_tjlXNayt';

// Login / kullanıcı yönetimi için master panel veritabanı
const masterSupabase = createClient(HOME_SUPABASE_URL, HOME_SUPABASE_KEY);


const ADMIN_BOOTSTRAP_USERNAME = 'admin';
const ADMIN_BOOTSTRAP_PASSWORD = '19871987';

const C = {
  green: '#22c55e',
  rose: '#f43f5e',
  cyan: '#22d3ee',
  orange: '#f97316',
  blue: '#60a5fa',
  indigo: '#818cf8',
  slate: '#94a3b8',
};

const QUICK_RANGES = [
  { label: 'Son 1s', minutes: 60 },
  { label: 'Son 6s', minutes: 360 },
  { label: 'Son 24s', minutes: 1440 },
  { label: 'Son 3g', minutes: 4320 },
  { label: 'Son 7g', minutes: 10080 },
  { label: 'Tümü', minutes: null },
];

const toLocalInput = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('tr-TR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const StatCard = ({ label, value, color, unit = '' }) => (
  <div
    style={{ borderLeftColor: color }}
    className="bg-slate-900/50 border border-slate-800 border-l-4 p-4 rounded-2xl flex flex-col gap-1 hover:bg-slate-900/80 transition-colors"
  >
    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    <span className="text-3xl font-black leading-none" style={{ color }}>
      {value}
      <span className="text-base font-bold ml-0.5">{unit}</span>
    </span>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4">{children}</h3>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

const MiniChart = ({ data, dataKey, color, label, type = 'area' }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
    <SectionTitle>{label}</SectionTitle>
    <ResponsiveContainer width="100%" height={120}>
      {type === 'line' ? (
        <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} name={label} />
        </LineChart>
      ) : (
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} name={label} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  </div>
);

const RangePicker = ({ from, to, onFrom, onTo, onQuick, activeQuick, loading, recordCount }) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-5">
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Hızlı Aralık</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => onQuick(r.minutes)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeQuick === r.minutes
                  ? 'bg-green-500 text-black shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:block w-px h-10 bg-slate-700 self-center" />

      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Başlangıç</span>
        <input
          type="datetime-local"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500/50 font-mono cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Bitiş</span>
        <input
          type="datetime-local"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500/50 font-mono cursor-pointer"
        />
      </div>

      <div className="ml-auto flex items-center gap-3 self-end">
        {loading && <span className="text-[10px] text-green-500 animate-pulse font-black uppercase">Yükleniyor...</span>}
        {!loading && recordCount !== null && (
          <span className="text-[10px] text-slate-500 font-mono">
            <span className="text-green-400 font-black">{recordCount}</span> kayıt
          </span>
        )}
      </div>
    </div>
  </div>
);

const BigAreaChart = ({ data, keys, title, height = 220 }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
    <SectionTitle>{title}</SectionTitle>
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          {keys.map((k) => (
            <linearGradient key={k.key} id={`g-${k.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={k.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={k.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 10, color: '#64748b' }} />
        {keys.map((k) => (
          <Area key={k.key} type="monotone" dataKey={k.key} stroke={k.color} strokeWidth={2} fill={`url(#g-${k.key})`} name={k.name} dot={false} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const BigLineChart = ({ data, keys, title, height = 180, yDomain }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
    <SectionTitle>{title}</SectionTitle>
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} domain={yDomain || ['auto', 'auto']} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 10, color: '#64748b' }} />
        {keys.map((k) => (
          <Line key={k.key} type="monotone" dataKey={k.key} stroke={k.color} strokeWidth={2} dot={false} name={k.name} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const LoginScreen = ({ loginForm, setLoginForm, onLogin, loginError }) => (
  <div className="min-h-screen bg-slate-950 text-slate-100 font-mono flex items-center justify-center p-5">
    <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
      <h1 className="text-2xl font-black text-green-400">DZY Panel Giriş</h1>
      <p className="text-xs text-slate-500 mt-1">Admin tarafından verilen kullanıcı adı/şifre ile giriş yapın.</p>

      <div className="mt-5 space-y-3">
        <input
          value={loginForm.username}
          onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))}
          placeholder="Kullanıcı adı"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={loginForm.password}
          onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="Şifre"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
        />
        {loginError && <p className="text-rose-400 text-xs">{loginError}</p>}
        <button onClick={onLogin} className="w-full bg-green-500 text-black rounded-xl py-2 font-black text-sm">
          Giriş Yap
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [sessionUser, setSessionUser] = useState(null);

  const [managedUsers, setManagedUsers] = useState([]);
  const [selectedTenantUserId, setSelectedTenantUserId] = useState('self');
  const [createUserForm, setCreateUserForm] = useState({
    customer_name: '',
    username: '',
    password: '',
    device_id: 1,
    tenant_supabase_url: '',
    tenant_supabase_anon_key: '',
  });

  const selectedTenantUser = useMemo(() => {
    if (!sessionUser) return null;
    if (selectedTenantUserId === 'self') return sessionUser;
    return managedUsers.find((u) => String(u.id) === String(selectedTenantUserId)) || sessionUser;
  }, [sessionUser, managedUsers, selectedTenantUserId]);

  const tenantSupabaseUrl = selectedTenantUser?.tenant_supabase_url || HOME_SUPABASE_URL;
  const tenantSupabaseKey = selectedTenantUser?.tenant_supabase_anon_key || HOME_SUPABASE_KEY;
  const telemetrySupabase = useMemo(
    () => createClient(tenantSupabaseUrl, tenantSupabaseKey),
    [tenantSupabaseUrl, tenantSupabaseKey],
  );
  const activeDeviceId = Number(selectedTenantUser?.device_id || 1);

  const [device, setDevice] = useState({
    servo_angle: 0, cpu_temp: 0, power_ma: 0,
    wifi_rssi: 0, last_servo_sync: 0, ambient_temp: 0, humidity: 0,
  });
  const [countdown, setCountdown] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [miniLogs, setMiniLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [activeQuick, setActiveQuick] = useState(1440);
  const [logRows, setLogRows] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPage, setLogPage] = useState(0);
  const LOG_PAGE_SIZE = 25;

  const now24 = () => {
    const to = new Date();
    const frm = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return { from: toLocalInput(frm), to: toLocalInput(to) };
  };
  const init = now24();
  const [rangeFrom, setRangeFrom] = useState(init.from);
  const [rangeTo, setRangeTo] = useState(init.to);
  const timerRef = useRef(null);

  const loadManagedUsers = useCallback(async () => {
    if (!sessionUser || sessionUser.role !== 'admin') return;
    const { data } = await masterSupabase
      .from('panel_users')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });
    setManagedUsers(data || []);
  }, [sessionUser]);

  const handleLogin = async () => {
    setLoginError('');
    const username = loginForm.username.trim();
    const password = loginForm.password;

    if (username === ADMIN_BOOTSTRAP_USERNAME && password === ADMIN_BOOTSTRAP_PASSWORD) {
      setSessionUser({
        id: 'bootstrap-admin',
        role: 'admin',
        username: ADMIN_BOOTSTRAP_USERNAME,
        customer_name: 'Admin',
        device_id: 1,
        tenant_supabase_url: HOME_SUPABASE_URL,
        tenant_supabase_anon_key: HOME_SUPABASE_KEY,
        is_active: true,
      });
      setSelectedTenantUserId('self');
      setActiveTab('dashboard');
      return;
    }

    const { data, error } = await masterSupabase
      .from('panel_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      setLoginError('Kullanıcı adı veya şifre hatalı.');
      return;
    }

    setSessionUser(data);
    setSelectedTenantUserId('self');
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setSessionUser(null);
    setManagedUsers([]);
    setSelectedTenantUserId('self');
    setActiveTab('dashboard');
  };

  const handleCreateUser = async () => {
    if (!createUserForm.username || !createUserForm.password || !createUserForm.tenant_supabase_url || !createUserForm.tenant_supabase_anon_key) return;

    const payload = {
      ...createUserForm,
      role: 'customer',
      is_active: true,
      device_id: Number(createUserForm.device_id || 1),
    };

    const { error } = await masterSupabase.from('panel_users').insert(payload);
    if (!error) {
      setCreateUserForm({
        customer_name: '', username: '', password: '', device_id: 1, tenant_supabase_url: '', tenant_supabase_anon_key: '',
      });
      loadManagedUsers();
    }
  };

  const fetchMiniLogs = useCallback(async () => {
    const { data } = await telemetrySupabase
      .from('device_logs')
      .select('created_at,ambient_temp,cpu_temp,humidity,power_ma,wifi_rssi')
      .eq('device_id', activeDeviceId)
      .order('created_at', { ascending: false })
      .limit(60);

    if (!data) return;
    const chartReady = [...data].reverse().map((r) => ({
      t: fmtTime(r.created_at),
      ambient_temp: r.ambient_temp,
      cpu_temp: r.cpu_temp,
      humidity: r.humidity,
      power_ma: r.power_ma,
      wifi_rssi: r.wifi_rssi,
    }));
    setMiniLogs(chartReady);
  }, [telemetrySupabase, activeDeviceId]);

  const fetchChartData = useCallback(async (from, to) => {
    setChartLoading(true);
    let q = telemetrySupabase
      .from('device_logs')
      .select('created_at,ambient_temp,cpu_temp,humidity,power_ma,wifi_rssi')
      .eq('device_id', activeDeviceId)
      .order('created_at', { ascending: true });

    if (from) q = q.gte('created_at', new Date(from).toISOString());
    if (to) q = q.lte('created_at', new Date(to).toISOString());

    const { data } = await q.limit(500);
    if (data) {
      const sampled = data.length > 200
        ? data.filter((_, i) => i % Math.ceil(data.length / 200) === 0)
        : data;
      setChartData(sampled.map((r) => ({
        t: fmtTime(r.created_at),
        ambient_temp: r.ambient_temp,
        cpu_temp: r.cpu_temp,
        humidity: r.humidity,
        power_ma: r.power_ma,
        wifi_rssi: r.wifi_rssi,
      })));
    }
    setChartLoading(false);
  }, [telemetrySupabase, activeDeviceId]);

  const fetchLogRows = useCallback(async (page = 0, from = rangeFrom, to = rangeTo) => {
    setLogLoading(true);
    let q = telemetrySupabase
      .from('device_logs')
      .select('*')
      .eq('device_id', activeDeviceId)
      .order('created_at', { ascending: false })
      .range(page * LOG_PAGE_SIZE, page * LOG_PAGE_SIZE + LOG_PAGE_SIZE - 1);

    if (from) q = q.gte('created_at', new Date(from).toISOString());
    if (to) q = q.lte('created_at', new Date(to).toISOString());
    const { data } = await q;
    if (data) setLogRows(data);
    setLogLoading(false);
  }, [telemetrySupabase, activeDeviceId, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!sessionUser) return;
    telemetrySupabase
      .from('devices')
      .select('*')
      .eq('id', activeDeviceId)
      .single()
      .then(({ data }) => data && setDevice(data));

    fetchMiniLogs();

    const ch = telemetrySupabase.channel(`db-live-${activeDeviceId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'devices', filter: `id=eq.${activeDeviceId}` },
        ({ new: n }) => {
          setDevice(n);
          if (n.servo_angle === 0) setCountdown(null);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'device_logs', filter: `device_id=eq.${activeDeviceId}` },
        () => {
          fetchMiniLogs();
          if (activeTab === 'charts') fetchChartData(rangeFrom, rangeTo);
          if (activeTab === 'logs') fetchLogRows(logPage, rangeFrom, rangeTo);
        },
      )
      .subscribe();

    return () => telemetrySupabase.removeChannel(ch);
  }, [sessionUser, telemetrySupabase, activeDeviceId, fetchMiniLogs]);

  useEffect(() => {
    if (!sessionUser) return;
    if (activeTab === 'charts') fetchChartData(rangeFrom, rangeTo);
    if (activeTab === 'logs') fetchLogRows(logPage, rangeFrom, rangeTo);
    if (sessionUser.role === 'admin') loadManagedUsers();
  }, [activeTab, sessionUser]);

  useEffect(() => {
    if (device.servo_angle === 70 && countdown === null) setCountdown(3);
    if (device.servo_angle === 90 && countdown === null) setCountdown(15);
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timerRef.current);
    }
    if (countdown === 0) setCountdown(null);
    return undefined;
  }, [device.servo_angle, countdown]);

  const applyQuickRange = (minutes) => {
    setActiveQuick(minutes);
    let from = '';
    let to = '';
    if (minutes !== null) {
      from = toLocalInput(new Date(Date.now() - minutes * 60 * 1000));
      to = toLocalInput(new Date());
    }
    setRangeFrom(from);
    setRangeTo(to);
    if (activeTab === 'charts') fetchChartData(from, to);
    if (activeTab === 'logs') {
      setLogPage(0);
      fetchLogRows(0, from, to);
    }
  };

  const handleFromChange = (v) => {
    setRangeFrom(v);
    setActiveQuick(null);
    if (activeTab === 'charts') fetchChartData(v, rangeTo);
    if (activeTab === 'logs') {
      setLogPage(0);
      fetchLogRows(0, v, rangeTo);
    }
  };

  const handleToChange = (v) => {
    setRangeTo(v);
    setActiveQuick(null);
    if (activeTab === 'charts') fetchChartData(rangeFrom, v);
    if (activeTab === 'logs') {
      setLogPage(0);
      fetchLogRows(0, rangeFrom, v);
    }
  };

  const updateAngle = async (a) => {
    setCountdown(null);
    await telemetrySupabase.from('devices').update({ servo_angle: a }).eq('id', activeDeviceId);
  };

  if (!sessionUser) {
    return (
      <LoginScreen
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        onLogin={handleLogin}
        loginError={loginError}
      />
    );
  }

  const rssiPct = Math.max(0, Math.min(100, ((device.wifi_rssi + 100) / 60) * 100));
  const rssiColor = rssiPct > 60 ? C.green : rssiPct > 30 ? C.orange : C.rose;

  const stat = (key, fn = 'avg') => {
    const vals = chartData.map((d) => d[key]).filter((v) => v != null && isFinite(v));
    if (!vals.length) return '—';
    const v = fn === 'max' ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0) / vals.length;
    return v.toFixed(1);
  };

  const tabs = sessionUser.role === 'admin'
    ? ['dashboard', 'charts', 'logs', 'admin']
    : ['dashboard', 'charts', 'logs'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center text-black font-black text-sm shadow-[0_0_16px_rgba(34,197,94,0.35)]">DZY</div>
            <div>
              <p className="text-sm font-black text-green-400 leading-none tracking-tight">YAZILIM DANISMA</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">Environmental Station v8.7</p>
            </div>
          </div>

          <div className="flex gap-1 bg-slate-900 rounded-xl p-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === t
                    ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-green-500/5 px-3 py-1.5 rounded-xl border border-green-500/20 shrink-0">
            <span className={`w-2 h-2 rounded-full bg-green-500 ${countdown ? 'animate-ping' : 'animate-pulse'}`} />
            <span className="text-[10px] text-green-400 font-black hidden sm:block">{countdown ? 'PROCESSING' : 'STABLE'}</span>
            <button onClick={handleLogout} className="ml-2 text-[10px] text-slate-300 border border-slate-700 rounded-lg px-2 py-1 hover:bg-slate-800">
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <StatCard label="Live Position" value={`${device.last_servo_sync}°`} color={C.green} />
              <StatCard label="Ambient Temp" value={device.ambient_temp} color={C.rose} unit="°C" />
              <StatCard label="Humidity" value={device.humidity} color={C.cyan} unit="%" />
              <StatCard label="CPU Core" value={device.cpu_temp?.toFixed(1)} color={C.orange} unit="°" />
              <StatCard label="Power Load" value={Math.round(device.power_ma)} color={C.blue} unit="mA" />
              <StatCard label="Signal RSSI" value={device.wifi_rssi} color={C.indigo} unit=" dB" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
                {countdown !== null && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-3xl border-2 border-green-500/20 m-1">
                    <p className="text-green-500 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse text-center mb-4">
                      TEMPORARY STATE ACTIVE
                      <br />
                      AUTO-RETURNING TO 0°
                    </p>
                    <span className="text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]">{countdown}s</span>
                  </div>
                )}
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Manual Override</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">SELECT TARGET AZIMUTH</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-600 block uppercase font-bold">Target</span>
                    <span className="text-4xl font-black text-green-500">{device.servo_angle}°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={device.servo_angle}
                  onChange={(e) => updateAngle(+e.target.value)}
                  className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-green-500 mb-8"
                />
                <div className="grid grid-cols-5 gap-3">
                  {[0, 45, 70, 90, 180].map((a) => (
                    <button
                      key={a}
                      onClick={() => updateAngle(a)}
                      className={`py-4 rounded-2xl font-black text-sm border transition-all duration-200 ${
                        device.servo_angle === a
                          ? 'bg-green-500 text-black border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-green-500/40 hover:text-green-400'
                      }`}
                    >
                      {a}°
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex-1">
                  <SectionTitle>Device Telemetry</SectionTitle>
                  <div className="space-y-3 text-xs">
                    {[
                      ['Hardware Sync', device.servo_angle === device.last_servo_sync
                        ? { text: 'MATCHED', color: C.green }
                        : { text: 'SYNCING...', color: '#eab308', pulse: true }],
                      ['Admin', { text: 'Muhammet Deniz', color: '#cbd5e1' }],
                      ['Region', { text: 'Buca_Hub_01', color: '#cbd5e1' }],
                      ['Protocol', { text: 'MQTT-SYNC-v8', color: '#cbd5e1' }],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-slate-800/50 pb-2 last:border-0">
                        <span className="text-slate-600">{k}:</span>
                        <span className={`font-bold ${v.pulse ? 'animate-pulse' : ''}`} style={{ color: v.color }}>{v.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                  <SectionTitle>WiFi Signal</SectionTitle>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-500">{device.wifi_rssi} dBm</span>
                    <span className="font-bold" style={{ color: rssiColor }}>{Math.round(rssiPct)}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${rssiPct}%`,
                        backgroundColor: rssiColor,
                        boxShadow: `0 0 8px ${rssiColor}60`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-green-500/5 border border-green-500/10 p-5 rounded-3xl">
                  <p className="text-[10px] text-green-500/50 leading-relaxed italic text-center">
                    "IoT System secure. Ambient temp and humidity modules initialized. v8.7 active."
                  </p>
                </div>
              </div>
            </div>

            {miniLogs.length > 0 && (
              <div>
                <SectionTitle>Quick Trends — Last {miniLogs.length} Records</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MiniChart data={miniLogs} dataKey="ambient_temp" color={C.rose} label="Ambient Temp" />
                  <MiniChart data={miniLogs} dataKey="humidity" color={C.cyan} label="Humidity" />
                  <MiniChart data={miniLogs} dataKey="cpu_temp" color={C.orange} label="CPU Temp" />
                  <MiniChart data={miniLogs} dataKey="power_ma" color={C.blue} label="Power Draw" type="line" />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'charts' && (
          <div>
            <RangePicker
              from={rangeFrom}
              to={rangeTo}
              onFrom={handleFromChange}
              onTo={handleToChange}
              onQuick={applyQuickRange}
              activeQuick={activeQuick}
              loading={chartLoading}
              recordCount={chartData.length}
            />

            {chartData.length === 0 && !chartLoading && (
              <div className="text-center text-slate-600 py-24 text-sm">Bu aralıkta kayıt bulunamadı.</div>
            )}

            {chartData.length > 0 && (
              <div className="space-y-5">
                <BigAreaChart
                  data={chartData}
                  title="Ambient Temperature & Humidity"
                  keys={[
                    { key: 'ambient_temp', color: C.rose, name: 'Ambient °C' },
                    { key: 'humidity', color: C.cyan, name: 'Humidity %' },
                  ]}
                  height={220}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <BigAreaChart
                    data={chartData}
                    title="CPU Temperature"
                    keys={[{ key: 'cpu_temp', color: C.orange, name: 'CPU °' }]}
                    height={180}
                  />
                  <BigLineChart
                    data={chartData}
                    title="Power Draw (mA)"
                    keys={[{ key: 'power_ma', color: C.blue, name: 'mA' }]}
                    height={180}
                  />
                </div>

                <BigLineChart
                  data={chartData}
                  title="WiFi RSSI History"
                  keys={[{ key: 'wifi_rssi', color: C.indigo, name: 'dBm' }]}
                  height={140}
                  yDomain={[-100, -30]}
                />

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                  <SectionTitle>Aralık İstatistikleri — {chartData.length} ölçüm</SectionTitle>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                    {[
                      { label: 'Ort. Sıcaklık', key: 'ambient_temp', color: C.rose, unit: '°C' },
                      { label: 'Ort. Nem', key: 'humidity', color: C.cyan, unit: '%' },
                      { label: 'Maks CPU', key: 'cpu_temp', color: C.orange, unit: '°', fn: 'max' },
                      { label: 'Ort. Güç', key: 'power_ma', color: C.blue, unit: 'mA' },
                      { label: 'En İyi RSSI', key: 'wifi_rssi', color: C.indigo, unit: 'dB', fn: 'max' },
                    ].map(({ label, key, color, unit, fn }) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</span>
                        <span className="text-2xl font-black" style={{ color }}>
                          {stat(key, fn)}
                          <span className="text-sm ml-0.5">{unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <RangePicker
              from={rangeFrom}
              to={rangeTo}
              onFrom={handleFromChange}
              onTo={handleToChange}
              onQuick={applyQuickRange}
              activeQuick={activeQuick}
              loading={logLoading}
              recordCount={logRows.length}
            />

            <div className="flex justify-between items-center mb-4">
              <SectionTitle>Log Kayıtları</SectionTitle>
              <button
                onClick={() => fetchLogRows(logPage, rangeFrom, rangeTo)}
                className="text-[10px] font-black uppercase tracking-widest text-green-500 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-500/10 transition-colors"
              >
                ↻ Yenile
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 mb-4">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-slate-900 text-slate-500 text-[10px] uppercase tracking-widest">
                    {['Zaman', 'Amb °C', 'Nem %', 'CPU °', 'mA', 'RSSI', 'Servo'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logRows.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`border-t border-slate-800/50 transition-colors ${i % 2 === 0 ? 'bg-slate-900/20' : 'bg-slate-950'} hover:bg-slate-800/40`}
                    >
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.rose }}>{r.ambient_temp?.toFixed(1)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.cyan }}>{r.humidity?.toFixed(1)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.orange }}>{r.cpu_temp?.toFixed(1)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.blue }}>{Math.round(r.power_ma)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.indigo }}>{r.wifi_rssi}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.green }}>{r.servo_angle}°</td>
                    </tr>
                  ))}
                  {logRows.length === 0 && !logLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-600">Bu aralıkta kayıt yok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center items-center gap-3">
              <button
                onClick={() => {
                  const p = Math.max(0, logPage - 1);
                  setLogPage(p);
                  fetchLogRows(p, rangeFrom, rangeTo);
                }}
                disabled={logPage === 0}
                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-30 hover:border-green-500/40 hover:text-green-400 transition-colors"
              >
                ← Önceki
              </button>
              <span className="text-[10px] text-slate-500 font-mono">Sayfa {logPage + 1}</span>
              <button
                onClick={() => {
                  const p = logPage + 1;
                  setLogPage(p);
                  fetchLogRows(p, rangeFrom, rangeTo);
                }}
                disabled={logRows.length < LOG_PAGE_SIZE}
                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-30 hover:border-green-500/40 hover:text-green-400 transition-colors"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'admin' && sessionUser.role === 'admin' && (
          <div className="space-y-5">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <SectionTitle>İzlenen Tenant</SectionTitle>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <select
                  value={selectedTenantUserId}
                  onChange={(e) => setSelectedTenantUserId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="self">Kendi Evim (Admin)</option>
                  {managedUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.customer_name || u.username}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">Bu seçim Dashboard/Charts/Logs ekranlarını etkiler.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                <SectionTitle>Yeni Kullanıcı Oluştur</SectionTitle>
                {[
                  ['customer_name', 'Müşteri adı'],
                  ['username', 'Kullanıcı adı'],
                  ['password', 'Şifre'],
                  ['tenant_supabase_url', 'Supabase URL'],
                  ['tenant_supabase_anon_key', 'Supabase anon key'],
                  ['device_id', 'Device ID'],
                ].map(([k, label]) => (
                  <input
                    key={k}
                    value={createUserForm[k]}
                    onChange={(e) => setCreateUserForm((p) => ({ ...p, [k]: e.target.value }))}
                    placeholder={label}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
                  />
                ))}
                <button onClick={handleCreateUser} className="w-full bg-green-500 text-black rounded-xl py-2 font-black">
                  Kullanıcı Kaydet
                </button>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <SectionTitle>Müşteriler</SectionTitle>
                <div className="space-y-2 max-h-[400px] overflow-auto pr-1">
                  {managedUsers.map((u) => (
                    <div key={u.id} className="border border-slate-700 rounded-xl p-3 text-xs">
                      <p className="font-bold text-green-400">{u.customer_name || u.username}</p>
                      <p className="text-slate-400">@{u.username} • device:{u.device_id}</p>
                      <p className="text-slate-500 truncate">{u.tenant_supabase_url}</p>
                    </div>
                  ))}
                  {managedUsers.length === 0 && <p className="text-xs text-slate-500">Henüz müşteri yok.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
