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
| GET | `notes` | Bearer | Hiện trả rỗng (chưa có bảng `doctor_notes`) |
| GET | `live` | Bearer | Ghép từ `vitals_minute`, `assessments`, `wearable_devices`. Quá 15 phút không có dữ liệu → `UNKNOWN` |
| GET | `vitals?from&to&resolution` | Bearer | Gộp theo `1m` / `5m` / `1h`, tối đa 31 ngày |
| GET | `alerts` | Bearer | Hiện trả rỗng (chưa có bảng `alerts`) |
| POST | `ingest/telemetry` | Bearer | Upsert `(device_id, seq)`, trả `acked_seq` |
| POST | `ingest/assessments` | Bearer | Upsert `(device_id, seq)` |
| POST | `ingest/status` | Bearer | Pin, đeo, backlog, config đang áp dụng |
| POST | `ingest/config-ack` | Bearer | |

**Gán vòng (giai đoạn 1):** vòng gửi dữ liệu qua app của bệnh nhân nào thì tự gán cho bệnh nhân đó nếu chưa ai
dùng (`device_assignments`). Vòng đang gán cho bệnh nhân khác → `403 WRONG_DEVICE`. Màn gán vòng thủ công
cho bác sĩ chưa làm.

**Ngưỡng T (giai đoạn 2):** bác sĩ sửa ở tab SpO₂ của hồ sơ bệnh nhân (`PUT /api/patients/{id}/monitoring-config`),
mỗi lần lưu là một version mới. Response `ingest/telemetry` và `ingest/status` trả `config_version_latest`; app thấy version
mới hơn thì tải `GET config`, ghi gói CONFIG 16 byte xuống vòng qua BLE, chờ STATUS báo version mới rồi gọi
`ingest/config-ack`. Web hiện "Vòng đã áp dụng vN" khi `wearable_devices.applied_config_version` ≥ version đang đặt.

**SpO₂ thật trên web:** `GET /api/patients/{id}/wearable?range=24h|7d|30d` (bác sĩ) trả trạng thái vòng, ngưỡng, bản ghi
phút 24 giờ, biểu đồ gộp 15 phút / 3 giờ / 1 ngày và nhật ký assessment. Trang bệnh nhân nghe Supabase Realtime trên
`vitals_minute`, `assessments`, `wearable_devices` để tải lại khi có dữ liệu mới.

Bản ghi có `ts < 1 600 000 000` (vòng chưa đồng bộ giờ) bị bỏ nhưng vẫn tính vào `acked_seq`, để app không gửi lại mãi.

## Cài đặt

1. Thêm `APP_JWT_SECRET` vào `.env.local` và biến môi trường của bản deploy (xem `.env.example`).
2. Chạy migration `drizzle/0010_app_access_and_wearables.sql` và `drizzle/0011_monitoring_configs.sql` theo quy trình migration hiện có
   (`npx drizzle-kit migrate`). Migration tạo `patient_app_access`, `app_sessions`, `wearable_devices`,
   `device_assignments`, `vitals_minute`, `assessments`; bật RLS (bác sĩ chỉ SELECT dữ liệu vòng, không ai đọc
   mã/phiên qua Supabase client) và thêm `vitals_minute`, `assessments`, `wearable_devices` vào publication
   `supabase_realtime`.
3. Bệnh nhân tạo **trước** migration chưa có mã: vào hồ sơ → *Cấp mã truy cập*.
4. App: `respicare.apiBaseUrl` trỏ tới `https://<domain>/api/app/v1/` (khi chạy local trên điện thoại thật:
   `http://<IP máy tính trong LAN>:3000/api/app/v1/`).

Kiểm tra trên máy: `npx vitest run --configLoader runner` (test mã hóa, payload, và chạy migration 0010 trên PGlite).

## Còn thiếu

- Bảng `doctor_notes`, `alerts` và màn bác sĩ viết lời dặn.
- Đường WiFi trực tiếp của vòng (`x-device-id` / `x-device-key`, `device_key_hash`).
- Trang tổng quan (dashboard) nhiều bệnh nhân vẫn dùng dữ liệu SpO₂ mẫu; trang hồ sơ bệnh nhân đã dùng dữ liệu thật.
- Thông báo đẩy FCM khi có ALERT/CRITICAL.
