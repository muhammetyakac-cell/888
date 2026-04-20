import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css'; // CSS dosyasını burada import ediyoruz

// Buraya kendi keylerini ekleyeceksin
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [loading, setLoading] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);

  const updateServo = async (angle, duration) => {
    setLoading(true);
    const { error } = await supabase
      .from('devices')
      .update({ servo_angle: angle })
      .eq('id', 1);

    if (!error) {
      setCurrentAngle(angle);
      setTimeout(async () => {
        await supabase.from('devices').update({ servo_angle: 0 }).eq('id', 1);
        setCurrentAngle(0);
        setLoading(false);
      }, duration);
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">DZY Kontrol Paneli</h1>
        <div className="space-y-4">
          <button 
            onClick={() => updateServo(70, 3000)}
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold hover:bg-emerald-600 disabled:bg-slate-300"
          >
            {loading ? 'Bekleyiniz...' : '70 Derece (3sn)'}
          </button>
          <button 
            onClick={() => updateServo(90, 15000)}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold hover:bg-blue-600 disabled:bg-slate-300"
          >
            {loading ? 'Bekleyiniz...' : '90 Derece (15sn)'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;