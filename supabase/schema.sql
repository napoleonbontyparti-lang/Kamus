-- KataCil: профили, друзья, рейтинг и облачная копия.
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
--
-- Таблицы закрыты (RLS без политик): приложение работает только через функции ниже.
-- Каждая функция, которая что-то меняет, проверяет ключ владельца (sha-256 от ключа восстановления).

create table if not exists public.profiles (
  code        text primary key check (code ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  key_hash    text not null,
  nick        text not null default 'Si Kancil' check (char_length(nick) between 1 and 40),
  avatar      text not null default '' check (char_length(avatar) <= 60000), -- маленькая картинка base64
  streak      int  not null default 0,
  week        int  not null default 0,   -- ответов за 7 дней
  total_cards int  not null default 0,
  goal_done   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.friends (
  owner  text not null references public.profiles(code) on delete cascade,
  friend text not null references public.profiles(code) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (owner, friend),
  check (owner <> friend)
);

create table if not exists public.backups (
  code       text primary key references public.profiles(code) on delete cascade,
  data       text not null check (char_length(data) <= 20000000),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.friends  enable row level security;
alter table public.backups  enable row level security;

-- проверка владельца
create or replace function public._owner_ok(p_code text, p_key_hash text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where code = p_code and key_hash = p_key_hash);
$$;

-- создать профиль или обновить свой (статистика, ник, аватар)
create or replace function public.upsert_profile(
  p_code text, p_key_hash text, p_nick text, p_avatar text,
  p_streak int, p_week int, p_total int, p_goal_done boolean
) returns json language plpgsql security definer set search_path = public as $$
declare existing profiles;
begin
  select * into existing from profiles where code = p_code;
  if existing.code is null then
    insert into profiles(code, key_hash, nick, avatar, streak, week, total_cards, goal_done)
    values (p_code, p_key_hash, coalesce(nullif(trim(p_nick), ''), 'Si Kancil'), coalesce(p_avatar, ''),
            p_streak, p_week, p_total, p_goal_done);
  elsif existing.key_hash <> p_key_hash then
    raise exception 'code_taken';
  else
    update profiles set nick = coalesce(nullif(trim(p_nick), ''), nick), avatar = coalesce(p_avatar, avatar),
      streak = p_streak, week = p_week, total_cards = p_total, goal_done = p_goal_done, updated_at = now()
    where code = p_code;
  end if;
  return json_build_object('ok', true);
end $$;

-- найти профиль по коду (только публичные поля)
create or replace function public.find_profile(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('code', code, 'nick', nick, 'avatar', avatar, 'streak', streak, 'week', week,
                           'total_cards', total_cards, 'goal_done', goal_done, 'updated_at', updated_at)
  from profiles where code = upper(trim(p_code));
$$;

create or replace function public.add_friend(p_code text, p_key_hash text, p_friend text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _owner_ok(p_code, p_key_hash) then raise exception 'not_owner'; end if;
  if not exists(select 1 from profiles where code = upper(trim(p_friend))) then raise exception 'not_found'; end if;
  insert into friends(owner, friend) values (p_code, upper(trim(p_friend))) on conflict do nothing;
  return find_profile(p_friend);
end $$;

create or replace function public.remove_friend(p_code text, p_key_hash text, p_friend text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _owner_ok(p_code, p_key_hash) then raise exception 'not_owner'; end if;
  delete from friends where owner = p_code and friend = p_friend;
  return json_build_object('ok', true);
end $$;

-- рейтинг: я + мои друзья, по очкам за неделю
create or replace function public.leaderboard(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('code', p.code, 'nick', p.nick, 'avatar', p.avatar, 'streak', p.streak,
           'week', p.week, 'total_cards', p.total_cards, 'goal_done', p.goal_done, 'updated_at', p.updated_at)
         order by p.week desc, p.streak desc), '[]'::json)
  from profiles p
  where p.code = p_code or p.code in (select friend from friends where owner = p_code);
$$;

-- облачная копия всех данных (для восстановления аккаунта на новом телефоне)
create or replace function public.save_backup(p_code text, p_key_hash text, p_data text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _owner_ok(p_code, p_key_hash) then raise exception 'not_owner'; end if;
  insert into backups(code, data) values (p_code, p_data)
  on conflict (code) do update set data = excluded.data, updated_at = now();
  return json_build_object('ok', true, 'at', now());
end $$;

-- восстановление: по коду и ключу возвращаем профиль и последнюю копию
create or replace function public.recover(p_code text, p_key_hash text) returns json
language plpgsql security definer set search_path = public as $$
declare pr profiles; bk backups;
begin
  select * into pr from profiles where code = upper(trim(p_code)) and key_hash = p_key_hash;
  if pr.code is null then raise exception 'not_owner'; end if;
  select * into bk from backups where code = pr.code;
  return json_build_object('nick', pr.nick, 'avatar', pr.avatar, 'backup', bk.data, 'backup_at', bk.updated_at);
end $$;

revoke all on function public._owner_ok(text, text) from public, anon, authenticated;
grant execute on function public.upsert_profile(text, text, text, text, int, int, int, boolean) to anon;
grant execute on function public.find_profile(text) to anon;
grant execute on function public.add_friend(text, text, text) to anon;
grant execute on function public.remove_friend(text, text, text) to anon;
grant execute on function public.leaderboard(text) to anon;
grant execute on function public.save_backup(text, text, text) to anon;
grant execute on function public.recover(text, text) to anon;

-- сообщить API, что появились новые функции
notify pgrst, 'reload schema';

select 'KataCil: схема установлена' as result;
