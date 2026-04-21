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
    last_servo_sync: 0,
    ambient_temp: 0,
    humidity: 0
  });
  const [countdown, setCountdown] = useState(null);

  // 1. Veri Takibi ve Realtime Aboneliği
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('devices').select('*').eq('id', 1).single();
      if (data) setDeviceData(data);
    };
    fetchData();

    // Supabase Realtime - Veritabanı değiştiği an arayüz güncellenir
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices', filter: 'id=eq.1' }, 
      (payload) => {
        setDeviceData(payload.new);
        // Cihaz kendini 0'a sıfırladığında web sayacı da temizlenir
        if (payload.new.servo_angle === 0) setCountdown(null);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 2. Zamanlama Mantığı Görselleştirme (ESP32 ile Senkronize)
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
    setCountdown(null); // Manuel komutta sayacı temizle
    await supabase.from('devices').update({ servo_angle: newAngle }).eq('id', 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Üst Bilgi Paneli */}
        <div className="flex justify-between items-center border-b border-green-900/40 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              DZY
            </div>
            <div>
              <h1 className="text-2xl font-black text-green-500 tracking-tighter leading-none">YAZILIM DANISMA</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Environmental Station v8.2 Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-[9px] text-slate-600 uppercase">System Frequency</p>
              <p className="text-xs font-bold text-green-800 tracking-widest">CORE_READY</p>
            </div>
            <div className="flex items-center gap-2 bg-green-500/5 px-4 py-2 rounded-xl border border-green-500/20">
              <div className={`w-2 h-2 bg-green-500 rounded-full ${countdown ? 'animate-ping' : 'animate-pulse'}`}></div>
              <span className="text-xs text-green-400 font-black">{countdown ? 'PROCESSING' : 'STABLE'}</span>
            </div>
          </div>
        </div>

        {/* Ana Telemetri Grid (6 Kartlı Yapı) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          
          {/* Servo Canlı Konumu */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl border-l-4 border-l-green-500">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Live Position</p>
            <h2 className="text-3xl font-black text-green-500">{deviceData.last_servo_sync}°</h2>
          </div>

          {/* Oda Sıcaklığı (DHT11) */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl border-l-4 border-l-rose-500">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Ambient Temp</p>
            <h2 className="text-3xl font-black text-rose-500">{deviceData.ambient_temp}°C</h2>
          </div>

          {/* Nem Oranı (DHT11) */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl border-l-4 border-l-cyan-400">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Humidity</p>
            <h2 className="text-3xl font-black text-cyan-400">%{deviceData.humidity}</h2>
          </div>

          {/* İşlemci Sıcaklığı */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl border-l-4 border-l-orange-500">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">CPU Core</p>
            <h2 className="text-3xl font-black text-orange-500">{deviceData.cpu_temp.toFixed(1)}°</h2>
          </div>

          {/* Güç Tüketimi */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl border-l-4 border-l-blue-400">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Current Load</p>
            <h2 className="text-3xl font-black text-blue-400">{Math.round(deviceData.power_ma)}mA</h2>
          </div>

          {/* WiFi Sinyali */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl border-l-4 border-l-indigo-500">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Signal RSSI</p>
            <h2 className="text-3xl font-black text-indigo-400">{deviceData.wifi_rssi}</h2>
          </div>
        </div>

        {/* Kontrol Paneli ve Geri Sayım */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-8 rounded-3xl relative overflow-hidden backdrop-blur-md">
            
            {/* Geri Sayım Overlay (70°/90° İçin) */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 border-2 border-green-500/20 rounded-3xl m-2">
                <p className="text-green-500 font-black text-xs mb-3 uppercase tracking-[0.3em] animate-pulse text-center">
                  TEMPORARY STATE ACTIVE<br/>AUTO-RETURNING TO 0°
                </p>
                <h4 className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{countdown}s</h4>
              </div>
            )}

            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight text-white uppercase">Manual Override</h3>
                <p className="text-[10px] text-slate-500 mt-1">SELECT TARGET AZIMUTH</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-600 block uppercase font-bold">Target Angle</span>
                <span className="text-3xl font-black text-green-500">{deviceData.servo_angle}°</span>
              </div>
            </div>
            
            <input 
              type="range" min="0" max="180" value={deviceData.servo_angle}
              onChange={(e) => updateAngle(parseInt(e.target.value))}
              className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500 mb-10"
            />

            <div className="grid grid-cols-5 gap-3">
              {[0, 45, 70, 90, 180].map((a) => (
                <button 
                  key={a} 
                  onClick={() => updateAngle(a)} 
                  className={`py-5 rounded-2xl font-black text-sm border transition-all duration-300 ${
                    deviceData.servo_angle === a 
                    ? 'bg-green-500 text-black border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.4)] scale-105' 
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-green-500/40 hover:text-green-400'
                  }`}
                >
                  {a}°
                </button>
              ))}
            </div>
          </div>

          {/* Sistem Günlüğü ve Durum */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Device Telemetry Logs</h4>
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800/40 pb-2">
                  <span className="text-slate-600">Hardware Sync:</span>
                  <span className={deviceData.servo_angle === deviceData.last_servo_sync ? "text-green-500 font-bold" : "text-yellow-500 animate-pulse"}>
                    {deviceData.servo_angle === deviceData.last_servo_sync ? "MATCHED" : "SYNCING..."}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/40 pb-2">
                  <span className="text-slate-600">Admin:</span>
                  <span className="text-slate-300">Muhammet Deniz</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/40 pb-2">
                  <span className="text-slate-600">Region:</span>
                  <span className="text-slate-300">Buca_Hub_01</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Protocol:</span>
                  <span className="text-slate-300 underline underline-offset-4 decoration-green-900">MQTT-SYNC-v8</span>
                </div>
              </div>
            </div>

            <div className="bg-green-500/5 border border-green-500/10 p-6 rounded-3xl">
               <p className="text-[10px] text-green-500/60 leading-relaxed italic text-center font-medium">
                 "IoT System secure. Ambient temp and humidity modules initialized successfully. Matrix background engine v8.2 active."
               </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
