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

Chạy migration `drizzle/0000_create_doctor_profiles.sql` bằng Supabase SQL Editor hoặc quy trình migration của môi trường triển khai.

## Cấp tài khoản bác sĩ

Không bật đăng ký công khai. Quản trị viên tạo tài khoản bằng Supabase Dashboard hoặc Admin API và phải bật xác nhận email ngay khi tạo. Với Admin API, tùy chọn bắt buộc là:

```ts
await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
```

Sau đó tạo đúng một hàng trong `public.doctor_profiles`, dùng chính UUID trả về từ `auth.users`:

```sql
insert into public.doctor_profiles (
  id,
  full_name,
  professional_title,
  specialty,
  department,
  avatar_url
) values (
  '<auth.users.id>',
  'BS. Nguyễn Văn A',
  'Bác sĩ chuyên khoa II',
  'Hô hấp',
  'Khoa Hô hấp',
  null
);
```

Khóa service-role chỉ được dùng trong môi trường quản trị tin cậy và không được đưa vào mã phía trình duyệt.
