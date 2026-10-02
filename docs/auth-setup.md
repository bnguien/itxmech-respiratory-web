# Thiết lập xác thực RespiCare

## Cấu hình Supabase

Ứng dụng cần các biến môi trường sau trong `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
DIRECT_DATABASE_URL=
```

Trong Supabase Auth URL Configuration, thêm các URL chuyển hướng được phép cho từng môi trường, ví dụ:

```text
http://localhost:3000/auth/callback
https://your-domain.example/auth/callback
```

Chạy toàn bộ migration Drizzle, bao gồm `drizzle/0000_create_doctor_profiles.sql` và `drizzle/0004_provision_doctor_profiles.sql`, bằng Supabase SQL Editor hoặc quy trình migration của môi trường triển khai.

## Cấp tài khoản bác sĩ

Không bật đăng ký công khai. Migration `drizzle/0004_provision_doctor_profiles.sql` tạo trigger provision một `doctor_profiles` có cùng UUID cho mọi tài khoản mới trong Supabase Auth, đồng thời backfill các tài khoản hiện có chưa có profile. Vì vậy không tạo profile thủ công sau khi tạo user.

Quản trị viên tạo tài khoản bằng Supabase Dashboard hoặc Admin API và phải bật xác nhận email ngay khi tạo. Với Admin API, truyền `full_name` trong metadata để profile được provision với tên bác sĩ:

```ts
await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "BS. Nguyễn Văn A" },
});
```

Các trường profile còn lại có thể được cập nhật từ trang cài đặt sau khi account được provision.

Khóa service-role chỉ được dùng trong môi trường quản trị tin cậy và không được đưa vào mã phía trình duyệt.
