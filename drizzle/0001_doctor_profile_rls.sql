alter table public.doctor_profiles enable row level security;

grant select, update on table public.doctor_profiles to authenticated;

create policy "Doctors can read their own profile"
on public.doctor_profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Doctors can update their own profile"
on public.doctor_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
