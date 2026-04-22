# DZY Servo Panel

> Real-time IoT telemetry dashboard with remote servo control.  
> Hardware meets cloud — ESP32 to Supabase to React.

🔴 **[Live Demo](https://esp32-henna.vercel.app/)**

![Dashboard Preview](dzy-servo-panel/docs/screenshot.png)

---

## The Problem

Off-the-shelf remote PC control solutions required Bluetooth hubs, 
third-party mobile apps, and constant vendor updates — creating 
unnecessary dependency and cost.

This system replaced all of that with a custom ESP32-based device 
and a cloud-connected dashboard. Total hardware cost: ~$15.

---

## What It Does

- **Real-time telemetry** — temperature, humidity, CPU heat, 
  power draw, and WiFi signal streamed live via Supabase Realtime
- **Remote servo control** — set target angle from anywhere, 
  hardware syncs within seconds
- **Historical analysis** — filter logs by time range (1h to 7d), 
  visualize trends with interactive charts
- **Offline queue** — device stores readings locally when 
  WiFi drops, flushes on reconnect
- **Auto-return logic** — predefined angles (70°/90°) trigger 
  timed automatic return to 0°

---

## Architecture

ESP32 (C++ / Arduino)
├── DHT11 sensor → ambient temp + humidity
├── Internal sensor → CPU temperature
├── Servo motor → position control
└── WiFi → Supabase REST API (PATCH + INSERT)
↓
Supabase (PostgreSQL)
├── devices table → live device state
└── device_logs table → historical telemetry
↓
React Dashboard (Vercel)
├── Realtime subscription → instant UI updates
├── Recharts → area + line charts
└── Date range picker → historical filtering

---

## Hardware

| Component | Purpose |
|---|---|
| ESP32 | Main controller, WiFi |
| DHT11 | Temperature & humidity |
| Servo Motor | Physical actuator |
| OLED SSD1306 | Local display |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS |
| Charts | Recharts |
| Backend | Supabase (Realtime, REST) |
| Hardware | ESP32, Arduino framework |
| Deployment | Vercel |

---

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/dzy-servo-panel
cd dzy-servo-panel
npm install
npm run dev
```

Configure your Supabase credentials in `src/App.jsx`:

```js
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';
```

Required tables: `devices`, `device_logs`

---

## ESP32 Firmware

Firmware source is included in `/firmware/sketch.ino`.  
Built with Arduino IDE. Key dependencies:

- `ArduinoJson`
- `ESP32Servo`
- `Adafruit SSD1306`
- `DHT sensor library`

---

## Developer

Built by **Muhammet Deniz** — DZY Software Consulting  
[kodingselling.vercel.app](https://kodingselling.vercel.app)
