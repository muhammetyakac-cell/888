import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('devices').select('*').eq('id', 1).single();
      if (data) setDeviceData(data);
    };
    fetchData();

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices', filter: 'id=eq.1' }, 
      (payload) => setDeviceData(payload.new))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const updateAngle = async (newAngle) => {
    await supabase.from('devices').update({ servo_angle: newAngle }).eq('id', 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-green-900/50 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-black text-green-500 tracking-tighter">DZY YAZILIM DANISMA</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Telemetry Uplink v7.1 // Secure Node</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-green-500/50 mb-1">NODE_STATUS</div>
            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400 font-bold">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Telemetri Kartları - 4'lü Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* SERVO KONUMU (YENİ KART) */}
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-green-500/50 transition-all">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Live Position</p>
            <h2 className="text-4xl font-black text-green-500">{deviceData.last_servo_sync}°</h2>
            <p className="text-[9px] text-slate-600 mt-2">REPORTED FROM DEVICE</p>
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M12 7v5l3 3"/></svg>
            </div>
          </div>

          {/* SICAKLIK */}
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-orange-500/50 transition-all">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">CPU Core</p>
            <h2 className="text-4xl font-black text-orange-500">{deviceData.cpu_temp.toFixed(1)}°C</h2>
            <div className="w-full bg-slate-800 h-1.5 mt-3 rounded-full overflow-hidden">
               <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${(deviceData.cpu_temp/80)*100}%` }}></div>
            </div>
          </div>

          {/* GÜÇ TÜKETİMİ */}
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-blue-500/50 transition-all">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Current Load</p>
            <h2 className="text-4xl font-black text-blue-400">{Math.round(deviceData.power_ma)}<span className="text-sm ml-1 font-normal text-slate-500">mA</span></h2>
            <div className="flex items-center gap-1 mt-3">
              <div className={`h-1 w-full bg-blue-500/20 rounded-full overflow-hidden`}>
                <div className="bg-blue-400 h-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>

          {/* WIFI */}
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-indigo-500/50 transition-all">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Signal Strength</p>
            <h2 className="text-4xl font-black text-indigo-400">{deviceData.wifi_rssi}<span className="text-sm ml-1 font-normal text-slate-500">dBm</span></h2>
            <div className="flex items-end gap-1 h-4 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-2 rounded-t-sm ${deviceData.wifi_rssi > -100 + (i*10) ? 'bg-indigo-500' : 'bg-slate-800'}`} style={{ height: `${i*25}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Kontrol Paneli */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black tracking-tight">MANUAL OVERRIDE</h3>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">TARGET_ANGLE</span>
                <span className="text-2xl font-black text-green-500">{deviceData.servo_angle}°</span>
              </div>
            </div>
            
            <input 
              type="range" min="0" max="180" value={deviceData.servo_angle}
              onChange={(e) => updateAngle(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500 mb-10"
            />

            <div className="grid grid-cols-4 gap-4">
              {[0, 45, 90, 180].map((a) => (
                <button key={a} onClick={() => updateAngle(a)} 
                  className={`py-4 rounded-xl font-bold border transition-all ${deviceData.servo_angle === a ? 'bg-green-500 text-black border-green-500 shadow-lg shadow-green-500/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-green-500/50 hover:text-green-400'}`}>
                  {a}°
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-black border border-slate-800 p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">System Logs</h4>
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-600">Sync Status:</span>
                  <span className={deviceData.servo_angle === deviceData.last_servo_sync ? "text-green-500" : "text-yellow-500 animate-pulse"}>
                    {deviceData.servo_angle === deviceData.last_servo_sync ? "MATCHED" : "PENDING"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-600">Location:</span>
                  <span className="text-slate-300 italic">Buca Hub</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-600">Admin:</span>
                  <span className="text-slate-300">Muhammet Deniz</span>
                </div>
              </div>
            </div>
            <div className="mt-8 p-4 bg-green-500/5 rounded-xl border border-green-500/10">
              <p className="text-[10px] text-green-500/70 leading-relaxed italic">
                "Full-stack IoT solution by DZY Yazılım Danışma. Secure Matrix Protocol active."
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;