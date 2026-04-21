import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const supabaseUrl = 'https://phicbgmciqrfeuwbnlrv.supabase.co';
const supabaseKey = 'sb_publishable_KsP-lQCVJyafRSMlN_5h2Q_tjlXNayt';
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Renk paleti ───────────────────────────────────────────
const C = {
  green:  '#22c55e',
  rose:   '#f43f5e',
  cyan:   '#22d3ee',
  orange: '#f97316',
  blue:   '#60a5fa',
  indigo: '#818cf8',
  slate:  '#94a3b8',
};

// ─── Küçük yardımcı bileşenler ────────────────────────────
const StatCard = ({ label, value, color, unit = '' }) => (
  <div style={{ borderLeftColor: color }}
    className="bg-slate-900/50 border border-slate-800 border-l-4 p-4 rounded-2xl flex flex-col gap-1 hover:bg-slate-900/80 transition-colors">
    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    <span className="text-3xl font-black leading-none" style={{ color }}>
      {value}<span className="text-base font-bold ml-0.5">{unit}</span>
    </span>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-4">{children}</h3>
);

// ─── Custom Tooltip ───────────────────────────────────────
const ChartTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{unit}
        </p>
      ))}
    </div>
  );
};

// ─── Grafik sarmalayıcı ───────────────────────────────────
const MiniChart = ({ data, dataKey, color, unit, label, type = 'area' }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
    <SectionTitle>{label}</SectionTitle>
    <ResponsiveContainer width="100%" height={120}>
      {type === 'line' ? (
        <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip unit={unit} />} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            dot={false} name={label} />
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
          <Tooltip content={<ChartTooltip unit={unit} />} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            fill={`url(#grad-${dataKey})`} name={label} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  </div>
);

// ─── Ana uygulama ─────────────────────────────────────────
export default function App() {
  const [device, setDevice] = useState({
    servo_angle: 0, cpu_temp: 0, power_ma: 0,
    wifi_rssi: 0, last_servo_sync: 0,
    ambient_temp: 0, humidity: 0
  });
  const [logs, setLogs] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logRows, setLogRows] = useState([]);
  const timerRef = useRef(null);

  // ── İlk yükleme + realtime ──────────────────────────────
  useEffect(() => {
    const boot = async () => {
      const { data: d } = await supabase.from('devices').select('*').eq('id', 1).single();
      if (d) setDevice(d);
      await fetchLogs();
    };
    boot();

    const ch = supabase.channel('db-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'devices', filter: 'id=eq.1' },
        ({ new: n }) => {
          setDevice(n);
          if (n.servo_angle === 0) setCountdown(null);
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'device_logs' },
        () => fetchLogs())
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  // ── Log geçmişi çek ─────────────────────────────────────
  const fetchLogs = async () => {
    const { data } = await supabase
      .from('device_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);
    if (!data) return;

    // Grafik için: eski → yeni, saat:dakika etiketi
    const chartReady = [...data].reverse().map(r => ({
      t: new Date(r.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      ambient_temp: r.ambient_temp,
      cpu_temp: r.cpu_temp,
      humidity: r.humidity,
      power_ma: r.power_ma,
      wifi_rssi: r.wifi_rssi,
    }));
    setLogs(chartReady);
    setLogRows(data.slice(0, 20)); // Tablo için son 20
  };

  // ── Geri sayım ──────────────────────────────────────────
  useEffect(() => {
    if (device.servo_angle === 70 && countdown === null) setCountdown(3);
    if (device.servo_angle === 90 && countdown === null) setCountdown(15);
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timerRef.current);
    }
    if (countdown === 0) setCountdown(null);
  }, [device.servo_angle, countdown]);

  const updateAngle = async (a) => {
    setCountdown(null);
    await supabase.from('devices').update({ servo_angle: a }).eq('id', 1);
  };

  // ── RSSI çubuk ──────────────────────────────────────────
  const rssiPct = Math.max(0, Math.min(100, ((device.wifi_rssi + 100) / 60) * 100));
  const rssiColor = rssiPct > 60 ? C.green : rssiPct > 30 ? C.orange : C.rose;

  // ── Tab içerikleri ───────────────────────────────────────
  const tabs = ['dashboard', 'charts', 'logs'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono">

      {/* ── Üst Bar ─────────────────────────────────────── */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center
              text-black font-black text-sm shadow-[0_0_16px_rgba(34,197,94,0.35)]">
              DZY
            </div>
            <div>
              <p className="text-sm font-black text-green-400 leading-none tracking-tight">YAZILIM DANISMA</p>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">Environmental Station v8.7</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-slate-900 rounded-xl p-1">
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === t
                    ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-green-500/5 px-3 py-1.5 rounded-xl border border-green-500/20">
            <span className={`w-2 h-2 rounded-full bg-green-500 ${countdown ? 'animate-ping' : 'animate-pulse'}`} />
            <span className="text-[10px] text-green-400 font-black">{countdown ? 'PROCESSING' : 'STABLE'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ══════════ DASHBOARD TAB ══════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* Stat kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <StatCard label="Live Position"  value={`${device.last_servo_sync}°`} color={C.green} />
              <StatCard label="Ambient Temp"   value={device.ambient_temp}           color={C.rose}   unit="°C" />
              <StatCard label="Humidity"       value={device.humidity}               color={C.cyan}   unit="%" />
              <StatCard label="CPU Core"       value={device.cpu_temp?.toFixed(1)}   color={C.orange} unit="°" />
              <StatCard label="Current Load"   value={Math.round(device.power_ma)}   color={C.blue}   unit="mA" />
              <StatCard label="Signal RSSI"    value={device.wifi_rssi}              color={C.indigo} unit=" dB" />
            </div>

            {/* Kontrol + Durum yan yana */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Servo kontrol */}
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl relative overflow-hidden">
                {countdown !== null && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col
                    items-center justify-center z-10 rounded-3xl border-2 border-green-500/20 m-1">
                    <p className="text-green-500 font-black text-[10px] uppercase tracking-[0.3em]
                      animate-pulse text-center mb-4">
                      TEMPORARY STATE ACTIVE<br />AUTO-RETURNING TO 0°
                    </p>
                    <span className="text-8xl font-black text-white
                      drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]">{countdown}s</span>
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

                <input type="range" min="0" max="180" value={device.servo_angle}
                  onChange={e => updateAngle(+e.target.value)}
                  className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-green-500 mb-8" />

                <div className="grid grid-cols-5 gap-3">
                  {[0, 45, 70, 90, 180].map(a => (
                    <button key={a} onClick={() => updateAngle(a)}
                      className={`py-4 rounded-2xl font-black text-sm border transition-all duration-200 ${
                        device.servo_angle === a
                          ? 'bg-green-500 text-black border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-green-500/40 hover:text-green-400'
                      }`}>
                      {a}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Durum paneli */}
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

                {/* WiFi sinyal çubuğu */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                  <SectionTitle>WiFi Signal</SectionTitle>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-500">{device.wifi_rssi} dBm</span>
                    <span className="font-bold" style={{ color: rssiColor }}>{Math.round(rssiPct)}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${rssiPct}%`, backgroundColor: rssiColor,
                        boxShadow: `0 0 8px ${rssiColor}60` }} />
                  </div>
                </div>

                <div className="bg-green-500/5 border border-green-500/10 p-5 rounded-3xl">
                  <p className="text-[10px] text-green-500/50 leading-relaxed italic text-center">
                    "IoT System secure. Ambient temp and humidity modules initialized. v8.7 active."
                  </p>
                </div>
              </div>
            </div>

            {/* Özet grafikler (son 10 kayıt) */}
            {logs.length > 0 && (
              <div>
                <SectionTitle>Quick Trends — Last {logs.length} Records</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MiniChart data={logs} dataKey="ambient_temp" color={C.rose}   unit="°C" label="Ambient Temp" />
                  <MiniChart data={logs} dataKey="humidity"     color={C.cyan}   unit="%"  label="Humidity" />
                  <MiniChart data={logs} dataKey="cpu_temp"     color={C.orange} unit="°"  label="CPU Temp" />
                  <MiniChart data={logs} dataKey="power_ma"     color={C.blue}   unit="mA" label="Power Draw" type="line" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ CHARTS TAB ══════════ */}
        {activeTab === 'charts' && (
          <div className="space-y-5">
            {logs.length === 0 ? (
              <div className="text-center text-slate-600 py-24 text-sm">
                Henüz log verisi yok. ESP32 30 saniyede bir gönderir.
              </div>
            ) : (
              <>
                {/* Sıcaklık + Nem büyük grafik */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                  <SectionTitle>Ambient Temperature & Humidity — Full History</SectionTitle>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={logs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad-at" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.rose} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={C.rose} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="grad-hum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.cyan} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="ambient_temp" stroke={C.rose} strokeWidth={2}
                        fill="url(#grad-at)" name="Ambient °C" />
                      <Area type="monotone" dataKey="humidity" stroke={C.cyan} strokeWidth={2}
                        fill="url(#grad-hum)" name="Humidity %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* CPU + Güç */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                    <SectionTitle>CPU Temperature</SectionTitle>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={logs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="grad-cpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={C.orange} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip unit="°" />} />
                        <Area type="monotone" dataKey="cpu_temp" stroke={C.orange} strokeWidth={2}
                          fill="url(#grad-cpu)" name="CPU °" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                    <SectionTitle>Power Draw (mA)</SectionTitle>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={logs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip unit="mA" />} />
                        <Line type="monotone" dataKey="power_ma" stroke={C.blue} strokeWidth={2}
                          dot={false} name="mA" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* WiFi RSSI */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                  <SectionTitle>WiFi RSSI History</SectionTitle>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={logs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} domain={[-100, -30]} />
                      <Tooltip content={<ChartTooltip unit=" dBm" />} />
                      <Line type="monotone" dataKey="wifi_rssi" stroke={C.indigo} strokeWidth={2}
                        dot={false} name="RSSI" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ LOGS TAB ══════════ */}
        {activeTab === 'logs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <SectionTitle>Device Log History — Last 20 Records</SectionTitle>
              <button onClick={fetchLogs}
                className="text-[10px] font-black uppercase tracking-widest text-green-500
                  border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-500/10 transition-colors">
                ↻ Refresh
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-slate-900 text-slate-500 text-[10px] uppercase tracking-widest">
                    {['Time', 'Amb °C', 'Hum %', 'CPU °', 'Power mA', 'RSSI', 'Servo °'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logRows.map((r, i) => (
                    <tr key={r.id}
                      className={`border-t border-slate-800/50 transition-colors
                        ${i % 2 === 0 ? 'bg-slate-900/20' : 'bg-slate-950'} hover:bg-slate-800/40`}>
                      <td className="px-4 py-2.5 text-slate-500">
                        {new Date(r.created_at).toLocaleString('tr-TR', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.rose }}>{r.ambient_temp?.toFixed(1)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.cyan }}>{r.humidity?.toFixed(1)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.orange }}>{r.cpu_temp?.toFixed(1)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.blue }}>{Math.round(r.power_ma)}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.indigo }}>{r.wifi_rssi}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: C.green }}>{r.servo_angle}°</td>
                    </tr>
                  ))}
                  {logRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-600">
                        Henüz log kaydı yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
