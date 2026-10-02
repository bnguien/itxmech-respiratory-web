insert into public.doctor_profiles (id, full_name)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(users.raw_user_meta_data ->> 'name'), ''),
    users.email,
    users.id::text
  )
from auth.users as users
on conflict (id) do nothing;--> statement-breakpoint

create or replace function public.provision_doctor_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.doctor_profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      new.email,
      new.id::text
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;--> statement-breakpoint

drop trigger if exists on_auth_user_created_provision_doctor_profile on auth.users;--> statement-breakpoint

create trigger on_auth_user_created_provision_doctor_profile
after insert on auth.users
for each row execute procedure public.provision_doctor_profile();
