import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Yapılandırması
const supabaseUrl = 'https://phicbgmciqrfeuwbnlrv.supabase.co';
const supabaseKey = 'sb_publishable_KsP-lQCVJyafRSMlN_5h2Q_tjlXNayt';
const supabase = createClient(supabaseUrl, supabaseKey);

const App = () => {
  const [deviceData, setDeviceData] = useState({
    servo_angle: 0,
    cpu_temp: 0,
    power_ma: 0,
    wifi_rssi: 0,
    last_servo_sync: 0
  });
  const [countdown, setCountdown] = useState(null);

  // 1. Veri Takibi ve Realtime Aboneliği
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('devices').select('*').eq('id', 1).single();
      if (data) setDeviceData(data);
    };
    fetchData();

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices', filter: 'id=eq.1' }, 
      (payload) => {
        setDeviceData(payload.new);
        // Eğer cihaz kendini 0'a sıfırladıysa sayacı durdur
        if (payload.new.servo_angle === 0) setCountdown(null);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 2. Geri Sayım Mantığı (Web tarafında görselleştirmek için)
  useEffect(() => {
    if (deviceData.servo_angle === 70 && countdown === null) setCountdown(3);
    if (deviceData.servo_angle === 90 && countdown === null) setCountdown(15);
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
    }
  }, [deviceData.servo_angle, countdown]);

  const updateAngle = async (newAngle) => {
    setCountdown(null); // Yeni komutta sayacı sıfırla
    await supabase.from('devices').update({ servo_angle: newAngle }).eq('id', 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-green-900/50 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center text-black font-bold">DZY</div>
            <div>
              <h1 className="text-xl font-black text-green-500 tracking-tighter">YAZILIM DANISMA</h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest text-right">Time-Logic v8.0 Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
            <div className={`w-2 h-2 bg-green-500 rounded-full ${countdown ? 'animate-ping' : 'animate-pulse'}`}></div>
            <span className="text-xs text-green-400 font-bold">{countdown ? 'PROCESSING' : 'ONLINE'}</span>
          </div>
        </div>

        {/* Telemetri Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-right">Live Position</p>
            <h2 className="text-4xl font-black text-green-500 text-right">{deviceData.last_servo_sync}°</h2>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-right">CPU Core</p>
            <h2 className="text-4xl font-black text-orange-500 text-right">{deviceData.cpu_temp.toFixed(1)}°C</h2>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-right">Power Load</p>
            <h2 className="text-4xl font-black text-blue-400 text-right">{Math.round(deviceData.power_ma)}mA</h2>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 text-right">Wifi RSSI</p>
            <h2 className="text-4xl font-black text-indigo-400 text-right">{deviceData.wifi_rssi}</h2>
          </div>
        </div>

        {/* Ana Kontrol ve Geri Sayım Ekranı */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-8 rounded-3xl relative overflow-hidden">
            
            {/* Geri Sayım Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-green-500/10 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <p className="text-green-500 font-bold text-sm mb-2 uppercase tracking-widest animate-pulse">Auto-Returning to 0°</p>
                <h4 className="text-6xl font-black text-white">{countdown}s</h4>
              </div>
            )}

            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black tracking-tight text-white">MANUAL OVERRIDE</h3>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">TARGET</span>
                <span className="text-2xl font-black text-green-500">{deviceData.servo_angle}°</span>
              </div>
            </div>
            
            <input 
              type="range" min="0" max="180" value={deviceData.servo_angle}
              onChange={(e) => updateAngle(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500 mb-10"
            />

            <div className="grid grid-cols-5 gap-2">
              {[0, 45, 70, 90, 180].map((a) => (
                <button key={a} onClick={() => updateAngle(a)} 
                  className={`py-4 rounded-xl font-bold border transition-all ${deviceData.servo_angle === a ? 'bg-green-500 text-black border-green-500 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-green-500/50'}`}>
                  {a}°
                </button>
              ))}
            </div>
          </div>

          {/* Sistem Bilgileri */}
          <div className="bg-gradient-to-br from-slate-900 to-black border border-slate-800 p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Device Logs</h4>
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-600">Sync:</span>
                  <span className={deviceData.servo_angle === deviceData.last_servo_sync ? "text-green-500" : "text-yellow-500 animate-pulse"}>
                    {deviceData.servo_angle === deviceData.last_servo_sync ? "STABLE" : "SYNCING"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-600">Location:</span>
                  <span className="text-slate-300">Buca Hub</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-600">Admin:</span>
                  <span className="text-slate-300">Muhammet Deniz</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-green-500/50 italic mt-6 border-t border-slate-800 pt-4">
              "70° [3s Delay] // 90° [15s Delay] Logic Integrated."
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
