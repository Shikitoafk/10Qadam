-- 10Qadam: run the entire file in the Supabase SQL editor.
-- Public clients use RPCs only. No service-role key belongs in the browser.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 2 and 24),
  rating_a1 integer not null default 1000 check (rating_a1 >= 100),
  rating_a2 integer not null default 1000 check (rating_a2 >= 100),
  games integer not null default 0,
  wins integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.words (
  id bigint generated always as identity primary key,
  level text not null check (level in ('A1','A2')),
  word text not null,
  unique(level,word)
);
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('duel','four')),
  level text not null check (level in ('A1','A2')),
  status text not null default 'playing' check (status in ('playing','finished')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating_before integer not null,
  rating_after integer,
  score integer not null default 0,
  correct integer not null default 0,
  primary key(match_id,user_id)
);
create index if not exists match_players_user_idx on public.match_players(user_id);
create table if not exists public.match_rounds (
  match_id uuid not null references public.matches(id) on delete cascade,
  round_index integer not null check (round_index between 0 and 9),
  word_id bigint not null references public.words(id),
  primary key(match_id,round_index)
);
create table if not exists public.answers (
  match_id uuid not null,
  user_id uuid not null,
  round_index integer not null,
  answer text not null check (char_length(answer) <= 64),
  correct boolean not null,
  points integer not null,
  elapsed_ms integer not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(match_id,user_id,round_index),
  foreign key(match_id,user_id) references public.match_players(match_id,user_id) on delete cascade,
  foreign key(match_id,round_index) references public.match_rounds(match_id,round_index) on delete cascade
);
create table if not exists public.matchmaking_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('duel','four')),
  level text not null check (level in ('A1','A2')),
  rating integer not null,
  queued_at timestamptz not null default clock_timestamp(),
  heartbeat_at timestamptz not null default clock_timestamp()
);
create index if not exists matchmaking_search_idx on public.matchmaking_queue(mode,level,queued_at);

alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_rounds enable row level security;
alter table public.answers enable row level security;
alter table public.matchmaking_queue enable row level security;
-- No direct reads of challenges, answers, queues or room internals.
revoke all on public.profiles, public.words, public.matches, public.match_players,
  public.match_rounds, public.answers, public.matchmaking_queue from anon, authenticated;
grant select on public.profiles to anon, authenticated;
drop policy if exists "Public player cards" on public.profiles;
create policy "Public player cards" on public.profiles for select using (true);

create or replace function public.handle_new_player()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text;
begin
  v_name := trim(coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'name', ''));
  if char_length(v_name) < 2 then v_name := 'Player-' || left(new.id::text, 6); end if;
  insert into public.profiles(id,username) values(new.id,left(v_name,24)) on conflict(id) do nothing;
  return new;
end; $$;
revoke all on function public.handle_new_player() from public, anon, authenticated;
drop trigger if exists on_spell_player_created on auth.users;
create trigger on_spell_player_created after insert on auth.users
for each row execute function public.handle_new_player();
-- Also cover accounts created before this schema was installed.
insert into public.profiles(id,username)
select id, 'Player-' || left(id::text,6) from auth.users on conflict(id) do nothing;

create or replace function public.update_player_name(p_username text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Сначала войдите в аккаунт'; end if;
  if p_username is null or char_length(trim(p_username)) not between 2 and 24 then raise exception 'Имя должно быть от 2 до 24 символов'; end if;
  update public.profiles set username=trim(p_username) where id=auth.uid() returning * into v_profile;
  return to_jsonb(v_profile);
end; $$;

create or replace function public.join_matchmaking(p_mode text, p_level text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid(); v_match uuid; v_rating integer;
  v_needed integer; v_candidates uuid[]; v_queue public.matchmaking_queue;
  v_start timestamptz; v_now timestamptz := clock_timestamp(); v_expired record;
begin
  if v_user is null then raise exception 'Сначала войдите в аккаунт'; end if;
  if p_mode not in ('duel','four') or p_level not in ('A1','A2') or p_mode is null or p_level is null then
    raise exception 'Неизвестный режим или уровень';
  end if;
  -- A short global transaction lock keeps queue consumption and room assignment atomic.
  perform pg_advisory_xact_lock(78123456);
  v_now := clock_timestamp();
  -- Settle abandoned/expired rooms before capturing this player's next rating.
  for v_expired in select m.id from public.match_players mp join public.matches m on m.id=mp.match_id
    where mp.user_id=v_user and m.status='playing' and m.ends_at<=v_now order by m.created_at
  loop
    perform public.finish_match(v_expired.id);
  end loop;
  select m.id into v_match from public.match_players mp join public.matches m on m.id=mp.match_id
    where mp.user_id=v_user and m.status='playing' and m.ends_at>v_now order by m.created_at desc limit 1;
  if v_match is not null then return jsonb_build_object('status','matched','match_id',v_match); end if;
  delete from public.matchmaking_queue where heartbeat_at<v_now-interval '30 seconds';
  select case p_level when 'A1' then rating_a1 else rating_a2 end into v_rating from public.profiles where id=v_user;
  if v_rating is null then raise exception 'Профиль не найден'; end if;
  insert into public.matchmaking_queue(user_id,mode,level,rating,queued_at,heartbeat_at)
    values(v_user,p_mode,p_level,v_rating,v_now,v_now)
    on conflict(user_id) do update set
      mode=excluded.mode,level=excluded.level,rating=excluded.rating,heartbeat_at=excluded.heartbeat_at,
      queued_at=case when matchmaking_queue.mode=excluded.mode and matchmaking_queue.level=excluded.level
        then matchmaking_queue.queued_at else excluded.queued_at end;
  select * into v_queue from public.matchmaking_queue where user_id=v_user;
  v_needed := case p_mode when 'duel' then 2 else 4 end;
  select array_agg(q.user_id order by q.queued_at) into v_candidates from (
    select user_id,queued_at from public.matchmaking_queue
    where mode=p_mode and level=p_level and user_id<>v_user
      and abs(rating-v_rating)<=least(600,100+floor(extract(epoch from (v_now-least(queued_at,v_queue.queued_at)))/10)*75)
      and not exists(select 1 from public.match_players mp join public.matches m on m.id=mp.match_id
        where mp.user_id=matchmaking_queue.user_id and m.status='playing' and m.ends_at>v_now)
    order by queued_at limit (v_needed-1)
  ) q;
  if coalesce(cardinality(v_candidates),0)<v_needed-1 then
    return jsonb_build_object('status','waiting','match_id',null,'queued_at',v_queue.queued_at,'mode',p_mode,'level',p_level);
  end if;
  v_candidates := array_append(v_candidates,v_user);
  v_start := clock_timestamp()+interval '3 seconds';
  insert into public.matches(mode,level,starts_at,ends_at) values(p_mode,p_level,v_start,v_start+interval '120 seconds') returning id into v_match;
  insert into public.match_players(match_id,user_id,rating_before)
    select v_match,id,case p_level when 'A1' then rating_a1 else rating_a2 end from public.profiles where id=any(v_candidates);
  insert into public.match_rounds(match_id,round_index,word_id)
    select v_match,(row_number() over()-1)::integer,id from (select id from public.words where level=p_level order by random() limit 10) w;
  if (select count(*) from public.match_rounds where match_id=v_match)<>10 then raise exception 'Недостаточно слов для матча'; end if;
  delete from public.matchmaking_queue where user_id=any(v_candidates);
  return jsonb_build_object('status','matched','match_id',v_match,'mode',p_mode,'level',p_level);
end; $$;

create or replace function public.cancel_matchmaking()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Сначала войдите в аккаунт'; end if;
  perform pg_advisory_xact_lock(78123456);
  delete from public.matchmaking_queue where user_id=auth.uid();
end; $$;

create or replace function public.poll_matchmaking()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_queue public.matchmaking_queue; v_match uuid;
begin
  if auth.uid() is null then raise exception 'Сначала войдите в аккаунт'; end if;
  select m.id into v_match from public.match_players mp join public.matches m on m.id=mp.match_id
    where mp.user_id=auth.uid() and m.status='playing' and m.ends_at>clock_timestamp() order by m.created_at desc limit 1;
  if v_match is not null then return jsonb_build_object('status','matched','match_id',v_match); end if;
  select * into v_queue from public.matchmaking_queue where user_id=auth.uid();
  if v_queue.user_id is null then return jsonb_build_object('status','idle','match_id',null); end if;
  return public.join_matchmaking(v_queue.mode,v_queue.level);
end; $$;

create or replace function public.get_match_state(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_match public.matches; v_now timestamptz := clock_timestamp(); v_index integer; v_word text; v_players jsonb; v_answers jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.match_players where match_id=p_match_id and user_id=auth.uid()) then
    raise exception 'Нет доступа к матчу';
  end if;
  select * into v_match from public.matches where id=p_match_id;
  v_index := floor(extract(epoch from (v_now-v_match.starts_at))/12)::integer;
  if v_index between 0 and 9 and v_match.status='playing' then
    select w.word into v_word from public.match_rounds r join public.words w on w.id=r.word_id
      where r.match_id=p_match_id and r.round_index=v_index;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'username',p.username,'rating',mp.rating_before,
    'rating_before',mp.rating_before,'rating_after',mp.rating_after,'rating_change',coalesce(mp.rating_after-mp.rating_before,0),'score',mp.score,'correct',mp.correct,
    'answered_current',exists(select 1 from public.answers a where a.match_id=p_match_id and a.user_id=p.id and a.round_index=v_index))
    order by mp.correct desc,mp.score desc,p.username), '[]'::jsonb)
    into v_players from public.match_players mp join public.profiles p on p.id=mp.user_id where mp.match_id=p_match_id;
  select coalesce(jsonb_agg(jsonb_build_object('index',r.round_index,'answer',coalesce(a.answer,''),'word',w.word,
    'correct',coalesce(a.correct,false),'points',coalesce(a.points,0)) order by r.round_index),'[]'::jsonb) into v_answers
    from public.match_rounds r join public.words w on w.id=r.word_id
    left join public.answers a on a.match_id=r.match_id and a.round_index=r.round_index and a.user_id=auth.uid()
    where r.match_id=p_match_id and (r.round_index<v_index or a.user_id is not null or v_match.status='finished');
  return jsonb_build_object('id',v_match.id,'mode',v_match.mode,'level',v_match.level,
    'status',case when v_match.status='finished' then 'finished' when v_now<v_match.starts_at then 'countdown' when v_now>=v_match.ends_at then 'ended' else 'playing' end,
    'starts_at',v_match.starts_at,'ends_at',v_match.ends_at,'server_now',v_now,
    'round_index',v_index,'round_count',10,'round_seconds',12,
    'challenge',case when v_word is null then null else jsonb_build_object('index',v_index,'word',v_word) end,
    'players',v_players,'results',v_players,'answers',v_answers);
end; $$;

create or replace function public.submit_match_answer(p_match_id uuid, p_round_index integer, p_answer text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_match public.matches; v_word text; v_now timestamptz; v_elapsed integer;
  v_correct boolean; v_points integer; v_score integer; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Сначала войдите в аккаунт'; end if;
  -- Shared room lock serializes deadline checks with finalization.
  select * into v_match from public.matches where id=p_match_id for update;
  if v_match.id is null or not exists(select 1 from public.match_players where match_id=p_match_id and user_id=v_user) then
    raise exception 'Нет доступа к матчу';
  end if;
  v_now := clock_timestamp();
  if p_round_index is null or p_round_index not between 0 and 9 or v_match.status<>'playing'
    or v_now<v_match.starts_at+p_round_index*interval '12 seconds'
    or v_now>=v_match.starts_at+(p_round_index+1)*interval '12 seconds' then raise exception 'Время ответа истекло'; end if;
  if p_answer is null or char_length(trim(p_answer)) not between 1 and 64 then raise exception 'Введите слово'; end if;
  if exists(select 1 from public.answers where match_id=p_match_id and user_id=v_user and round_index=p_round_index) then
    raise exception 'Ответ уже отправлен';
  end if;
  select w.word into v_word from public.match_rounds r join public.words w on w.id=r.word_id
    where r.match_id=p_match_id and r.round_index=p_round_index;
  v_elapsed := greatest(0,floor(extract(epoch from (v_now-v_match.starts_at-p_round_index*interval '12 seconds'))*1000)::integer);
  v_correct := lower(trim(p_answer))=lower(v_word);
  v_points := case when v_correct then 100+greatest(0,floor(50*(1-v_elapsed/12000.0))::integer) else 0 end;
  insert into public.answers(match_id,user_id,round_index,answer,correct,points,elapsed_ms)
    values(p_match_id,v_user,p_round_index,lower(trim(p_answer)),v_correct,v_points,v_elapsed);
  update public.match_players set score=score+v_points,correct=correct+case when v_correct then 1 else 0 end
    where match_id=p_match_id and user_id=v_user returning score into v_score;
  return jsonb_build_object('correct',v_correct,'points',v_points,'score',v_score,'word',v_word,'answer',lower(trim(p_answer)));
end; $$;

create or replace function public.finish_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_match public.matches; v_player record; v_delta integer; v_rating integer; v_best integer; v_best_score integer;
begin
  if auth.uid() is null or not exists(select 1 from public.match_players where match_id=p_match_id and user_id=auth.uid()) then
    raise exception 'Нет доступа к матчу';
  end if;
  perform pg_advisory_xact_lock(78123456);
  select * into v_match from public.matches where id=p_match_id for update;
  if v_match.status='finished' then return public.get_match_state(p_match_id); end if;
  if clock_timestamp()<v_match.ends_at then raise exception 'Матч еще не завершен'; end if;
  select correct,score into v_best,v_best_score from public.match_players where match_id=p_match_id order by correct desc,score desc limit 1;
  -- The mean pairwise Elo change handles 1v1 and four-player rooms consistently.
  for v_player in select * from public.match_players where match_id=p_match_id order by user_id loop
    select round(32*avg(
      case when (v_player.correct,v_player.score)>(opponent.correct,opponent.score) then 1.0
        when (v_player.correct,v_player.score)=(opponent.correct,opponent.score) then 0.5 else 0.0 end
      -1.0/(1.0+power(10.0,(opponent.rating_before-v_player.rating_before)/400.0))
    ))::integer into v_delta from public.match_players opponent
      where opponent.match_id=p_match_id and opponent.user_id<>v_player.user_id;
    if v_match.level='A1' then
      update public.profiles set rating_a1=greatest(100,rating_a1+v_delta),games=games+1,
        wins=wins+case when v_player.correct=v_best and v_player.score=v_best_score and v_best>0 then 1 else 0 end
        where id=v_player.user_id returning rating_a1 into v_rating;
    else
      update public.profiles set rating_a2=greatest(100,rating_a2+v_delta),games=games+1,
        wins=wins+case when v_player.correct=v_best and v_player.score=v_best_score and v_best>0 then 1 else 0 end
        where id=v_player.user_id returning rating_a2 into v_rating;
    end if;
    update public.match_players set rating_after=v_rating where match_id=p_match_id and user_id=v_player.user_id;
  end loop;
  update public.matches set status='finished' where id=p_match_id;
  return public.get_match_state(p_match_id);
end; $$;

-- Supabase exposes only the authenticated, explicit player-facing RPCs.
revoke all on function public.update_player_name(text),public.join_matchmaking(text,text),
  public.cancel_matchmaking(),public.poll_matchmaking(),public.get_match_state(uuid),
  public.submit_match_answer(uuid,integer,text),public.finish_match(uuid) from public, anon;
grant execute on function public.update_player_name(text),public.join_matchmaking(text,text),
  public.cancel_matchmaking(),public.poll_matchmaking(),public.get_match_state(uuid),
  public.submit_match_answer(uuid,integer,text),public.finish_match(uuid) to authenticated;

-- Starter bank; approximate beginner vocabulary, reviewed independently of any exam board.
insert into public.words(level,word) values
('A1','apple'),('A1','house'),('A1','water'),('A1','friend'),('A1','school'),
('A1','family'),('A1','mother'),('A1','father'),('A1','sister'),('A1','brother'),
('A1','garden'),('A1','window'),('A1','yellow'),('A1','orange'),('A1','purple'),
('A1','happy'),('A1','small'),('A1','table'),('A1','chair'),('A1','bread'),
('A1','milk'),('A1','coffee'),('A1','morning'),('A1','evening'),('A1','summer'),
('A1','winter'),('A1','flower'),('A1','animal'),('A1','rabbit'),('A1','people'),
('A1','picture'),('A1','teacher'),('A1','student'),('A1','music'),('A1','hello'),
('A1','please'),('A1','sorry'),('A1','beautiful'),('A1','birthday'),('A1','kitchen'),
('A1','bedroom'),('A1','football'),('A1','doctor'),('A1','sunday'),('A1','today'),
('A1','tomorrow'),('A1','breakfast'),('A1','dinner'),('A1','chicken'),('A1','country'),
('A2','journey'),('A2','weather'),('A2','neighbour'),('A2','different'),('A2','important'),
('A2','interesting'),('A2','comfortable'),('A2','expensive'),('A2','wonderful'),('A2','together'),
('A2','remember'),('A2','believe'),('A2','describe'),('A2','improve'),('A2','decide'),
('A2','explain'),('A2','practice'),('A2','language'),('A2','message'),('A2','question'),
('A2','answer'),('A2','mistake'),('A2','hospital'),('A2','restaurant'),('A2','supermarket'),
('A2','airport'),('A2','village'),('A2','mountain'),('A2','island'),('A2','holiday'),
('A2','dangerous'),('A2','careful'),('A2','friendly'),('A2','healthy'),('A2','hungry'),
('A2','thirsty'),('A2','surprised'),('A2','excited'),('A2','borrow'),('A2','invite'),
('A2','arrive'),('A2','forget'),('A2','perhaps'),('A2','usually'),('A2','already'),
('A2','especially'),('A2','experience'),('A2','information'),('A2','education'),('A2','environment')
on conflict(level,word) do nothing;
commit;
