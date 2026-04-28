# DZY Servo Panel - Multi Tenant

Bu sürümle birlikte mevcut dashboard tasarımı korunarak, üstüne **login + admin kullanıcı yönetimi** eklendi:

- Giriş ekranı (admin / müşteri)
- Admin panelinden kullanıcı oluşturma
- Kullanıcıya özel Supabase URL + anon key tanımlama
- Oluşturulan kullanıcıların kendi ESP telemetrisini mevcut ana sayfa görünümünde izlemesi

## Mimari

### 1) Master veritabanı (panel kullanıcıları)
Web panel ilk olarak sabit bir "master" Supabase'e bağlanır.
Bu veritabanında `panel_users` tablosu tutulur.

Örnek kolonlar:

- `id` uuid (pk)
- `username` text unique
- `password` text
- `role` text (`admin` / `customer`)
- `customer_name` text
- `device_id` int
- `tenant_supabase_url` text
- `tenant_supabase_anon_key` text
- `is_active` bool
- `created_at` timestamptz default now()

### 2) Tenant veritabanı (müşteri verileri)
Her müşteri için ayrı Supabase projesi kullanılır.
Bu tenant projede en az:

- `devices`
- `device_logs`

olmalıdır.

Panel, login olan kullanıcının `tenant_supabase_url` + `tenant_supabase_anon_key` bilgilerine göre dinamik client oluşturur.

## ESP32 entegrasyonu

Cihazı müşteriye göndermeden önce firmware içinde aşağıdakileri müşteriye özel doldurun:

```cpp
const char* supabaseBaseUrl = "https://MUSTERI.supabase.co/rest/v1/devices?id=eq.1";
const char* supabaseLogsUrl = "https://MUSTERI.supabase.co/rest/v1/device_logs";
const char* supabaseKey     = "MUSTERI_ANON_KEY";
```

Aynı değerleri admin panelinden o müşterinin hesabına da girin.
Böylece:

- cihaz müşterinin kendi tenantına log atar,
- müşteri panelden giriş yapınca aynı tenant verisini görür,
- müşteriler birbirinin verisini göremez.

## Güvenlik Notu

Bu sürüm MVP'dir. Üretim için öneri:

- `password` yerine hash (bcrypt/argon2) saklayın,
- kullanıcı oluşturma ve login işlemlerini Edge Function / backend ile yapın,
- RLS politikalarını tenant izolasyonuna göre zorunlu hale getirin.

## Çalıştırma

```bash
cd dzy-servo-panel
npm install
npm run dev
```
