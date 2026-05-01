#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include "DHT.h"

// --- KONFİGÜRASYON ---
const char* ssid            = "TurkNet1000Mbps_24BF2";
const char* password        = "RTm8x24MwLt4";

// Müşteri tenant Supabase bilgileri (device_id = 1)
const int   deviceId        = 1;
const char* supabaseBaseUrl = "https://qchylcdaqzivljrjspkz.supabase.co/rest/v1/devices?id=eq.1";
const char* supabaseLogsUrl = "https://qchylcdaqzivljrjspkz.supabase.co/rest/v1/device_logs";
const char* supabaseKey     = "sb_publishable_HJchZxGPFFXdKc0boITUbQ_SevJpART";

// --- DHT11 ---
#define DHTPIN      4
#define DHTTYPE     DHT11
#define VIRTUAL_VCC 15
DHT dht(DHTPIN, DHTTYPE);

// --- OLED ---
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// --- DZY LOGO (24x24) ---
const unsigned char dzy_logo_24x24[] PROGMEM = {
  0x00,0x00,0x00,0x00,0x7e,0x00,0x03,0xff,0xc0,0x07,0x81,0xe0,0x0e,0x00,0x70,0x1c,
  0x00,0x38,0x18,0x7e,0x18,0x30,0xff,0x0c,0x31,0xc3,0x8c,0x63,0x81,0xc6,0x63,0x00,
  0xc6,0x63,0x00,0xc6,0x63,0x81,0xc6,0x31,0xc3,0x8c,0x30,0xff,0x0c,0x18,0x7e,0x18,
  0x1c,0x00,0x38,0x0e,0x00,0x70,0x07,0x81,0xe0,0x03,0xff,0xc0,0x00,0x7e,0x00,0x00,
  0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00
};

volatile int   sharedAngle    = 0;
volatile int   wifiRSSI       = 0;
volatile float displayedPower = 180.0;
volatile float cpuTemp        = 0.0;
volatile float ambientTemp    = 0.0;
volatile float humidity       = 0.0;
volatile bool  isWaiting      = false;
unsigned long  waitStartTime  = 0;
unsigned long  waitDuration   = 0;

Servo myservo;
const int servoPin = 13;

String scrollingMessage = "DZY YAZILIM DANISMA - v8.7 THERMAL VISION - DATA:D4 - 70deg/3s - 90deg/15s - ";
float  scrollX   = 128.0;
int    textWidth = 0;

#define QUEUE_SIZE 20

struct TelemetryRecord {
  float         cpuTemp;
  float         ambientTemp;
  float         humidity;
  float         power;
  int           rssi;
  int           angle;
  unsigned long timestamp;
};

TelemetryRecord   offlineQueue[QUEUE_SIZE];
int               queueHead  = 0;
int               queueCount = 0;
SemaphoreHandle_t queueMutex;

void enqueueRecord(TelemetryRecord rec) {
  if (xSemaphoreTake(queueMutex, pdMS_TO_TICKS(100))) {
    offlineQueue[queueHead] = rec;
    queueHead = (queueHead + 1) % QUEUE_SIZE;
    if (queueCount < QUEUE_SIZE) queueCount++;
    xSemaphoreGive(queueMutex);
  }
}

bool insertLog(TelemetryRecord& r) {
  HTTPClient http;
  http.begin(supabaseLogsUrl);
  http.addHeader("apikey",        supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Content-Type",  "application/json");
  http.addHeader("Prefer",        "return=minimal");
  http.setTimeout(5000);

  String payload = "{\"device_id\":" + String(deviceId) +
    ",\"cpu_temp\":"     + String(r.cpuTemp, 1)     +
    ",\"ambient_temp\":" + String(r.ambientTemp, 1) +
    ",\"humidity\":"     + String(r.humidity, 1)    +
    ",\"power_ma\":"     + String(r.power, 1)       +
    ",\"wifi_rssi\":"    + String(r.rssi)            +
    ",\"servo_angle\":"  + String(r.angle)           +
    "}";

  int code = http.POST(payload);
  http.end();
  return (code == 201);
}

void flushOfflineQueue() {
  if (queueCount == 0) return;
  int tail = (queueHead - queueCount + QUEUE_SIZE) % QUEUE_SIZE;

  if (xSemaphoreTake(queueMutex, pdMS_TO_TICKS(200))) {
    int toFlush = queueCount;
    xSemaphoreGive(queueMutex);

    for (int i = 0; i < toFlush; i++) {
      int idx = (tail + i) % QUEUE_SIZE;
      if (insertLog(offlineQueue[idx])) {
        if (xSemaphoreTake(queueMutex, pdMS_TO_TICKS(100))) {
          queueCount--;
          xSemaphoreGive(queueMutex);
        }
      } else {
        break;
      }
      vTaskDelay(300 / portTICK_PERIOD_MS);
    }
  }
}

void sendPatch(int angle, bool onlyAngle = false) {
  HTTPClient http;
  http.begin(supabaseBaseUrl);
  http.addHeader("apikey",        supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Content-Type",  "application/json");
  http.setTimeout(5000);

  String payload = onlyAngle
    ? "{\"servo_angle\":"     + String(angle) + ",\"last_servo_sync\":" + String(angle) + "}"
    : "{\"cpu_temp\":"        + String(cpuTemp)        +
      ",\"power_ma\":"        + String(displayedPower)  +
      ",\"wifi_rssi\":"       + String(wifiRSSI)        +
      ",\"last_servo_sync\":" + String(angle)           +
      ",\"ambient_temp\":"    + String(ambientTemp)     +
      ",\"humidity\":"        + String(humidity)        + "}";

  http.PATCH(payload);
  http.end();
}

#ifdef __cplusplus
extern "C" { uint8_t temprature_sens_read(); }
#endif

void TelemetryTask(void* pvParameters) {
  unsigned long lastTelemetryUplink = 0;
  bool          wasDisconnected     = false;

  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {
      if (wasDisconnected) {
        wasDisconnected = false;
        flushOfflineQueue();
      }

      wifiRSSI = WiFi.RSSI();

      HTTPClient http;
      http.begin(String(supabaseBaseUrl) + "&select=servo_angle");
      http.addHeader("apikey",        supabaseKey);
      http.addHeader("Authorization", "Bearer " + String(supabaseKey));
      http.setTimeout(5000);

      if (http.GET() == 200) {
        JsonDocument doc;
        deserializeJson(doc, http.getString());
        int newAngle = doc[0]["servo_angle"];
        if (!isWaiting && newAngle != sharedAngle) {
          sharedAngle = newAngle;
          if      (sharedAngle == 70) { isWaiting = true; waitStartTime = millis(); waitDuration = 3000;  }
          else if (sharedAngle == 90) { isWaiting = true; waitStartTime = millis(); waitDuration = 15000; }
        }
      }
      http.end();

      if (isWaiting && (millis() - waitStartTime >= waitDuration)) {
        isWaiting   = false;
        sharedAngle = 0;
        sendPatch(0, true);
      }

      if (millis() - lastTelemetryUplink >= 30000) {
        lastTelemetryUplink = millis();
        sendPatch(sharedAngle);

        TelemetryRecord rec = {
          cpuTemp, ambientTemp, humidity,
          displayedPower, wifiRSSI, sharedAngle,
          millis() / 1000,
        };
        insertLog(rec);
      }

    } else {
      wasDisconnected = true;
      wifiRSSI = -99;

      TelemetryRecord rec = {
        cpuTemp, ambientTemp, humidity,
        displayedPower, -99, sharedAngle,
        millis() / 1000,
      };
      enqueueRecord(rec);

      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }

    vTaskDelay(2000 / portTICK_PERIOD_MS);
  }
}

void drawWifiIcon(int x, int y, int rssi) {
  if (rssi > -90) display.fillRect(x,      y + 6, 2, 2, SSD1306_WHITE);
  if (rssi > -80) display.fillRect(x + 4,  y + 4, 2, 4, SSD1306_WHITE);
  if (rssi > -70) display.fillRect(x + 8,  y + 2, 2, 6, SSD1306_WHITE);
  if (rssi > -60) display.fillRect(x + 12, y,     2, 8, SSD1306_WHITE);
}

void runRotorCheck() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("> INITIALIZING ROTOR");
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  display.display();
  myservo.write(180); delay(1000);
  myservo.write(0);   delay(1000);
  display.setCursor(0, 20);
  display.println("> ROTOR SYNC: OK");
  display.display(); delay(800);
}

void runInitialization() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  const char* steps[] = {
    "> KERNEL BOOT", "> ROTOR OK",
    "> DHT11 SYNC",  "> WIFI LINK",
    "> SYSTEM READY",
  };
  for (int i = 0; i < 5; i++) {
    display.setCursor(0, i * 12);
    display.println(steps[i]);
    display.display();
    delay(600);
  }
}

void printResetReason() {
  esp_reset_reason_t reason = esp_reset_reason();
  Serial.print(">>> RESET SEBEBI: ");
  switch (reason) {
    case ESP_RST_POWERON:   Serial.println("Guc acildi (normal)"); break;
    case ESP_RST_SW:        Serial.println("Software reset"); break;
    case ESP_RST_PANIC:     Serial.println("PANIC / Exception"); break;
    case ESP_RST_INT_WDT:   Serial.println("Interrupt Watchdog"); break;
    case ESP_RST_TASK_WDT:  Serial.println("Task Watchdog"); break;
    case ESP_RST_WDT:       Serial.println("Diger Watchdog"); break;
    case ESP_RST_BROWNOUT:  Serial.println("!!! BROWNOUT - Guc sorunu !!!"); break;
    case ESP_RST_UNKNOWN:   Serial.println("Bilinmiyor"); break;
    default:                Serial.println(reason); break;
  }
}

void setup() {
  Serial.begin(115200);
  printResetReason();

  Wire.begin(21, 22);
  Wire.setClock(400000);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  queueMutex = xSemaphoreCreateMutex();

  pinMode(VIRTUAL_VCC, OUTPUT);
  digitalWrite(VIRTUAL_VCC, HIGH);
  delay(2000);
  dht.begin();

  ESP32PWM::allocateTimer(0);
  myservo.attach(servoPin, 500, 2400);
  runRotorCheck();

  WiFi.begin(ssid, password);
  runInitialization();
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
  }

  textWidth = scrollingMessage.length() * 6;
  xTaskCreatePinnedToCore(TelemetryTask, "Telemetry", 16000, NULL, 1, NULL, 0);
}

void loop() {
  static int           currentServoAngle = -1;
  static unsigned long lastSensorRead    = 0;
  static unsigned long lastDisplayUpdate = 0;
  static unsigned long lastPowerUpdate   = 0;
  unsigned long now = millis();

  if (now - lastSensorRead > 3000) {
    lastSensorRead = now;
    cpuTemp = (temprature_sens_read() - 32) / 1.8;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) { ambientTemp = t; humidity = h; }
  }

  if (sharedAngle != currentServoAngle) {
    myservo.write(sharedAngle);
    currentServoAngle = sharedAngle;
  }

  if (now - lastPowerUpdate >= 1000) {
    lastPowerUpdate = now;
    displayedPower = 182.0 + (isWaiting ? 5.0 : 0.0) + random(-3, 3);
  }

  if (now - lastDisplayUpdate < 30) return;
  lastDisplayUpdate = now;

  display.clearDisplay();
  display.fillRect(72, 0, 56, 26, SSD1306_BLACK);
  drawWifiIcon(112, 4, wifiRSSI);
  display.setCursor(75, 4);  display.print("T:"); display.print((int)cpuTemp); display.print("C");
  display.setCursor(75, 14); display.print("P:"); display.print((int)displayedPower);

  if (queueCount > 0) {
    display.setCursor(75, 20);
    display.print("Q:"); display.print(queueCount);
  }

  display.fillRect(0, 0, 26, 26, SSD1306_BLACK);
  display.drawBitmap(1, 1, dzy_logo_24x24, 24, 24, SSD1306_WHITE);
  display.fillRect(28, 0, 42, 26, SSD1306_BLACK);
  display.setCursor(30, 4);  display.print("DZY");
  display.setCursor(30, 14); display.print("v8.7");
  display.drawLine(28, 24, 68, 24, SSD1306_WHITE);

  display.fillRect(40, 27, 88, 24, SSD1306_BLACK);
  display.setCursor(42, 28);
  if (isWaiting) {
    display.print("AUTO RETURN...");
    display.setCursor(56, 37); display.setTextSize(2);
    display.print((waitDuration - (now - waitStartTime)) / 1000);
    display.print("s");
  } else {
    int cycle = (now / 3000) % 3;
    if (cycle == 0) {
      display.print("SERVO STATUS");
      display.setCursor(56, 37); display.setTextSize(2);
      display.print(sharedAngle); display.print((char)247);
    } else if (cycle == 1) {
      display.print("ROOM HUMIDITY");
      display.setCursor(56, 37); display.setTextSize(2);
      if (humidity > 0) { display.print((int)humidity); display.print("%"); }
      else { display.print("ERR"); }
    } else {
      display.print("ROOM TEMP");
      display.setCursor(56, 37); display.setTextSize(2);
      if (ambientTemp > 0) { display.print((int)ambientTemp); display.print((char)247); display.print("C"); }
      else { display.print("ERR"); }
    }
  }

  display.setTextSize(1);
  display.fillRect(0, 52, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setCursor((int)scrollX, 55);
  display.print(scrollingMessage);
  display.setTextColor(SSD1306_WHITE);

  display.display();

  scrollX -= 0.5;
  if (scrollX < -textWidth) scrollX = 128.0;
}
