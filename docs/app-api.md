# API cho app người nhà (`/api/app/v1`)

App Android RespiCare gọi các route này. Payload bám theo DTO của app
(`ITxMech_RespiratoryCare/app/src/main/java/.../data/remote/dto/RespiCareDtos.kt`). JSON dùng `snake_case`,
lỗi có dạng `{"error":{"code","message"}}`.

## Luồng đăng nhập

1. Bác sĩ tạo bệnh nhân trên web (`POST /api/patients`). Server tạo hồ sơ và **mã truy cập 6 số** trong cùng một
   transaction, trả `app_access: { patient_code, access_code }` đúng một lần. DB chỉ lưu hash scrypt
   (`patient_app_access`).
2. Web hiện popup mã bệnh nhân + mã truy cập, bác sĩ đưa cho người nhà (sao chép thành tin nhắn).
3. Mất mã: hồ sơ bệnh nhân → thẻ **Đăng nhập app người nhà** → *Cấp lại mã truy cập*
   (`POST /api/patients/{id}/app-access`). Mã cũ hết hiệu lực, mọi phiên app đang mở bị thu hồi.
4. Người nhà đăng nhập app: `POST /api/app/v1/auth/login` → access token (JWT HS256, 1 giờ) + refresh token
   (30 ngày, xoay vòng mỗi lần refresh, DB chỉ lưu SHA-256 trong `app_sessions`).

## Endpoint

| Method | Đường dẫn | Xác thực | Ghi chú |
|---|---|---|---|
| GET | `health` | không | Kiểm tra kết nối |
| POST | `auth/login` | không | Sai 5 lần → khóa 15 phút (`429`, `Retry-After`) |
| POST | `auth/refresh` | refresh token | `401` khi phiên bị thu hồi hoặc hết hạn → app đăng xuất |
| POST | `auth/logout` | Bearer | Thu hồi phiên |
| PATCH | `session` | Bearer | `is_ble_gateway`, `fcm_token`. Bật gateway ở máy này thì tắt ở máy khác |
| GET | `me` | Bearer | Hồ sơ, bác sĩ, vòng đang gán |
| GET | `config` | Bearer | Ngưỡng mới nhất bác sĩ đặt (`monitoring_configs`), chưa đặt thì mặc định version 0 |
| GET | `notes` | Bearer | Lời dặn của bác sĩ (`doctor_notes`), mới nhất trước |
| GET | `live` | Bearer | Số hiện tại giống nhau ở mọi máy: số 15 giây (`wearable_live`) hoặc bản ghi phút, cái nào đo sau hơn; `measured_at` là giờ đo, `reading_source` = `live` / `minute`. `connection` {kind, title, detail, fresh} cùng quy tắc trang bác sĩ: gián đoạn / mất kết nối → `state` = `UNKNOWN`, `spo2`/`pulse` = null, `last_spo2` giữ số cuối để app ghi "số cuối … lúc …" |
| GET | `vitals?from&to&resolution` | Bearer | Gộp theo `1m` / `5m` / `1h`, tối đa 31 ngày |
| GET | `alerts?status=open\|all&limit` | Bearer | Cảnh báo ALERT / CRITICAL (`wearable_alerts`), dạng `AlertDto` |
| POST | `alerts/{id}/ack` | Bearer | Người nhà xác nhận đã biết |
| PUT | `alerts/{id}/feedback` | Bearer | Góp ý cảnh báo đúng / sai |
| POST | `device-key` | Bearer | Cấp khóa mới cho vòng (khóa cũ hết hiệu lực), app ghi xuống vòng qua BLE op `0x03` |
| GET | `device/config` | `x-device-id` + `x-device-key` | Vòng tự lấy ngưỡng khi chạy WiFi, có `ble_config_hex`, ETag theo version |
| POST | `ingest/telemetry` | Bearer hoặc khóa thiết bị | Upsert `(device_id, seq)`, trả `acked_seq`, `config_version_latest`, `server_time` |
| POST | `ingest/assessments` | Bearer hoặc khóa thiết bị | Upsert `(device_id, seq)`; dòng mới mức ALERT / CRITICAL sinh cảnh báo |
| POST | `ingest/status` | Bearer | Pin, đeo, backlog, config đang áp dụng |
| POST | `ingest/config-ack` | Bearer hoặc khóa thiết bị | |
| POST | `ingest/live` | Bearer hoặc khóa thiết bị | Số hiển thị 15 giây (LIVE v2) app gateway chuyển ngay khi nhận. Ghi đè một dòng mỗi vòng, gói cũ hơn không đè số mới. `ts` phải là giờ thật |
| POST | `ingest/diagnostics` | Bearer hoặc khóa thiết bị | Hiệu năng vòng mỗi 5 phút (DIAG: % CPU tb / đỉnh, thời gian model / phút / flash, RAM, WiFi, lý do reset). Bỏ trùng theo `(device_id, boot_id, uptime_s)` |

**Lỗi:** mọi route đều trả `{"error":{code,message}}`. DB tạm không với tới (hết kết nối pooler, rớt mạng) → `503
SERVICE_UNAVAILABLE` + `Retry-After: 30`; app và vòng giữ dữ liệu trong outbox / flash và gửi lại sau. Lỗi khác → `500
INTERNAL_ERROR`. Không còn trang lỗi HTML mặc định của Next.js.

**Cảnh báo (ALERT / CRITICAL):** `ingest/assessments` gộp các phút liên tiếp thành một đợt (cách nhau dưới 30 phút).
Đợt mới → tạo dòng `wearable_alerts` và gửi FCM `alert_opened`; ALERT lên CRITICAL → nâng mức, mở lại và gửi lại;
còn lại chỉ dời `last_seen_at`. Web nghe Realtime trên `wearable_alerts`: chuông cập nhật với mọi cảnh báo, riêng
CRITICAL chưa xem hiện thẻ đỏ ở đầu mọi trang tới khi bác sĩ bấm "Đã xem" (`POST /api/alerts/{id}/acknowledge`).

**Thông báo đẩy FCM** (data message, app tự hiện thông báo): `alert_opened` (ưu tiên cao), `note_added` khi bác sĩ
thêm lời dặn, `note_updated` khi bác sĩ sửa lời dặn (`GET notes` có `edited: true`, app báo "bác sĩ đã sửa lời dặn"),
`config_changed` khi bác sĩ đổi ngưỡng (app tải ngưỡng và ghi xuống vòng ngay). Server gọi FCM HTTP v1
bằng khóa tài khoản dịch vụ `FIREBASE_SERVICE_ACCOUNT_JSON`; thiếu biến thì bỏ qua, không ảnh hưởng request. Token
chết (gỡ app) được xóa khỏi `app_sessions`.

**Gán vòng (giai đoạn 1):** vòng gửi dữ liệu qua app của bệnh nhân nào thì tự gán cho bệnh nhân đó nếu chưa ai
dùng (`device_assignments`). Vòng đang gán cho bệnh nhân khác → `403 WRONG_DEVICE`. Màn gán vòng thủ công
cho bác sĩ chưa làm.

**Ngưỡng T (giai đoạn 2):** bác sĩ sửa ở tab SpO₂ của hồ sơ bệnh nhân (`PUT /api/patients/{id}/monitoring-config`),
mỗi lần lưu là một version mới. Response `ingest/telemetry` và `ingest/status` trả `config_version_latest`; app thấy version
mới hơn thì tải `GET config`, ghi gói CONFIG 16 byte xuống vòng qua BLE, chờ STATUS báo version mới rồi gọi
`ingest/config-ack`. Web hiện "Vòng đã áp dụng vN" khi `wearable_devices.applied_config_version` ≥ version đang đặt.

**SpO₂ thật trên web:** `GET /api/patients/{id}/wearable?range=24h|7d|30d` (bác sĩ) trả trạng thái vòng, ngưỡng, bản ghi
phút 24 giờ, biểu đồ gộp 15 phút / 3 giờ / 1 ngày, nhật ký assessment, số 15 giây mới nhất (`live`) và hiệu năng vòng
24 giờ (`diagnostics`). Trang bệnh nhân nghe Supabase Realtime trên `vitals_minute`, `assessments`, `wearable_devices`
để tải lại khi có dữ liệu mới; `wearable_live` cập nhật tại chỗ (không tải lại cả trang). Realtime không nối được thì tự
tải lại mỗi 30 giây. Trạng thái kết nối tự tính lại mỗi 15 giây: quá 90 giây không nhận gì qua BLE là "Gián đoạn kết nối –
tạm thời không nhận được SpO₂", quá chu kỳ WiFi + 5 phút là "Mất kết nối – không nhận được tín hiệu SpO₂"; khi đó các ô
SpO₂ / mức hiện tại hiện "—" và số cuối kèm giờ, không giữ số cũ như số hiện tại.

Migration `0014_wearable_live_and_diagnostics.sql` thêm `wearable_live` (Realtime) và `device_diagnostics`.

Bản ghi có `ts < 1 600 000 000` (vòng chưa đồng bộ giờ) bị bỏ nhưng vẫn tính vào `acked_seq`, để app không gửi lại mãi.

## Cài đặt

1. Thêm `APP_JWT_SECRET`, `DATABASE_URL` (transaction pooler, cổng 6543) và `FIREBASE_SERVICE_ACCOUNT_JSON` vào
   `.env.local` và biến môi trường của bản deploy (xem `.env.example`).
2. Chạy migration `drizzle/0010_app_access_and_wearables.sql` đến `drizzle/0013_wearable_alerts.sql` theo quy trình migration hiện có
   (`npx drizzle-kit migrate`). Migration tạo `patient_app_access`, `app_sessions`, `wearable_devices`,
   `device_assignments`, `vitals_minute`, `assessments`; bật RLS (bác sĩ chỉ SELECT dữ liệu vòng, không ai đọc
   mã/phiên qua Supabase client) và thêm `vitals_minute`, `assessments`, `wearable_devices` vào publication
   `supabase_realtime`.
3. Bệnh nhân tạo **trước** migration chưa có mã: vào hồ sơ → *Cấp mã truy cập*.
4. App: `respicare.apiBaseUrl` trỏ tới `https://<domain>/api/app/v1/` (khi chạy local trên điện thoại thật:
   `http://<IP máy tính trong LAN>:3000/api/app/v1/`).

Kiểm tra trên máy: `npx vitest run --configLoader runner` (test mã hóa, payload, và chạy migration 0010 trên PGlite).

## Còn thiếu

- Màn gán vòng thủ công cho bác sĩ.
- Thông báo `no_data` (vòng im lặng quá lâu) gửi từ server: cần một tác vụ định kỳ (cron) chưa làm. Web đã hiện trạng
  thái "mất kết nối" ở hồ sơ bệnh nhân và trang Thiết bị.
- Lịch làm việc ở bảng bên phải dashboard chỉ lưu trong trình duyệt (chưa có bảng lịch hẹn).
