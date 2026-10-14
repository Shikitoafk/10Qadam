-- Sentence battles: additive, repeatable upgrade for the existing ranked schema.
-- No historical word rooms, answers or ratings are reset.
begin;
-- BEGIN SENTENCE BATTLES
select pg_advisory_xact_lock(78123456);
alter table public.profiles
  add column if not exists rating_sentence_a1 integer not null default 1000 check (rating_sentence_a1 >= 100),
  add column if not exists rating_sentence_a2 integer not null default 1000 check (rating_sentence_a2 >= 100),
  add column if not exists rating_sentence_b1 integer not null default 1000 check (rating_sentence_b1 >= 100),
  add column if not exists rating_sentence_b2 integer not null default 1000 check (rating_sentence_b2 >= 100),
  add column if not exists rating_sentence_c1 integer not null default 1000 check (rating_sentence_c1 >= 100),
  add column if not exists games_sentence integer not null default 0,
  add column if not exists wins_sentence integer not null default 0;
alter table public.words add column if not exists kind text not null default 'words' check (kind in ('words','sentences'));
alter table public.matches add column if not exists format text not null default 'words' check (format in ('words','sentences'));
alter table public.matchmaking_queue add column if not exists format text not null default 'words' check (format in ('words','sentences'));
alter table public.answers add column if not exists accuracy integer check (accuracy between 0 and 100);
alter table public.answers drop constraint if exists answers_answer_check;
alter table public.answers add constraint answers_answer_check check (char_length(answer) <= 500);
create index if not exists matchmaking_format_search_idx on public.matchmaking_queue(format,mode,level,queued_at);

-- Private bounded scorer. The server, never the submitted client score, decides accuracy.
create or replace function public.normalize_sentence(p_text text)
returns text language sql immutable set search_path = public, pg_temp as $fn$
  select trim(regexp_replace(translate(lower(normalize(coalesce(p_text,''),NFKC)),
    $punct$!"#%&'()*,-./:;?@[\]_{}…“”‘’—–«»$punct$, ''), '[[:space:]]+', ' ', 'g'));
$fn$;
create or replace function public.sentence_accuracy(p_answer text,p_target text)
returns integer language plpgsql immutable set search_path = public, pg_temp as $fn$
declare
  a text := public.normalize_sentence(p_answer); e text := public.normalize_sentence(p_target);
  previous integer[]; current integer[]; i integer; j integer; width integer; distance integer;
begin
  if char_length(a)>500 or char_length(e)>500 then raise exception 'Sentence exceeds 500 characters'; end if;
  width := greatest(char_length(a),char_length(e));
  if width=0 then return 100; end if;
  previous := array(select generate_series(0,char_length(a)));
  for i in 1..char_length(e) loop
    current := array[i];
    for j in 1..char_length(a) loop
      current := array_append(current,least(previous[j+1]+1,current[j]+1,
        previous[j]+case when substr(e,i,1)=substr(a,j,1) then 0 else 1 end));
    end loop;
    previous := current;
  end loop;
  distance := previous[char_length(a)+1];
  return floor(greatest(0,1-distance::numeric/width)*100+0.5)::integer;
end; $fn$;
revoke all on function public.normalize_sentence(text),public.sentence_accuracy(text,text) from public,anon,authenticated;

create or replace function public.join_matchmaking(p_mode text,p_level text,p_format text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid(); v_match uuid; v_rating integer;
  v_needed integer; v_candidates uuid[]; v_queue public.matchmaking_queue;
  v_start timestamptz; v_now timestamptz := clock_timestamp(); v_expired record;
  v_rounds integer; v_seconds integer; v_field text;
begin
  if v_user is null then raise exception 'Сначала войдите в аккаунт'; end if;
  if p_mode is null or p_level is null or p_format is null or p_mode not in ('duel','four')
    or p_level not in ('A1','A2','B1','B2','C1') or p_format not in ('words','sentences') then
    raise exception 'Неизвестный режим, уровень или формат';
  end if;
  perform pg_advisory_xact_lock(78123456);
  v_now := clock_timestamp();
  for v_expired in select m.id from public.match_players mp join public.matches m on m.id=mp.match_id
    where mp.user_id=v_user and m.status='playing' and m.ends_at<=v_now order by m.created_at
  loop perform public.finish_match(v_expired.id); end loop;
  select m.id into v_match from public.match_players mp join public.matches m on m.id=mp.match_id
    where mp.user_id=v_user and m.status='playing' and m.ends_at>v_now order by m.created_at desc limit 1;
  if v_match is not null then return jsonb_build_object('status','matched','match_id',v_match); end if;
  delete from public.matchmaking_queue where heartbeat_at<v_now-interval '30 seconds';
  v_field := 'rating_' || case when p_format='sentences' then 'sentence_' else '' end || lower(p_level);
  select (to_jsonb(p)->>v_field)::integer into v_rating from public.profiles p where id=v_user;
  if v_rating is null then raise exception 'Профиль не найден'; end if;
  insert into public.matchmaking_queue(user_id,mode,level,format,rating,queued_at,heartbeat_at)
    values(v_user,p_mode,p_level,p_format,v_rating,v_now,v_now)
    on conflict(user_id) do update set
      mode=excluded.mode,level=excluded.level,format=excluded.format,rating=excluded.rating,heartbeat_at=excluded.heartbeat_at,
      queued_at=case when matchmaking_queue.mode=excluded.mode and matchmaking_queue.level=excluded.level
        and matchmaking_queue.format=excluded.format then matchmaking_queue.queued_at else excluded.queued_at end;
  select * into v_queue from public.matchmaking_queue where user_id=v_user;
  v_needed := case p_mode when 'duel' then 2 else 4 end;
  select array_agg(q.user_id order by q.queued_at) into v_candidates from (
    select user_id,queued_at from public.matchmaking_queue
    where mode=p_mode and level=p_level and format=p_format and user_id<>v_user
      and abs(rating-v_rating)<=least(600,100+floor(extract(epoch from (v_now-least(queued_at,v_queue.queued_at)))/10)*75)
      and not exists(select 1 from public.match_players mp join public.matches m on m.id=mp.match_id
        where mp.user_id=matchmaking_queue.user_id and m.status='playing' and m.ends_at>v_now)
    order by queued_at limit (v_needed-1)
  ) q;
  if coalesce(cardinality(v_candidates),0)<v_needed-1 then
    return jsonb_build_object('status','waiting','match_id',null,'queued_at',v_queue.queued_at,'mode',p_mode,'level',p_level,'format',p_format);
  end if;
  v_candidates := array_append(v_candidates,v_user);
  v_rounds := case when p_format='sentences' then 5 else 10 end;
  v_seconds := case when p_format='sentences' then 35 else 12 end;
  v_start := clock_timestamp()+interval '3 seconds';
  insert into public.matches(mode,level,format,starts_at,ends_at)
    values(p_mode,p_level,p_format,v_start,v_start+v_rounds*v_seconds*interval '1 second') returning id into v_match;
  insert into public.match_players(match_id,user_id,rating_before)
    select v_match,id,(to_jsonb(p)->>v_field)::integer from public.profiles p where id=any(v_candidates);
  insert into public.match_rounds(match_id,round_index,word_id)
    select v_match,(row_number() over()-1)::integer,id from (
      select id from public.words where level=p_level and kind=p_format order by random() limit v_rounds
    ) w;
  if (select count(*) from public.match_rounds where match_id=v_match)<>v_rounds then raise exception 'Недостаточно заданий для матча'; end if;
  delete from public.matchmaking_queue where user_id=any(v_candidates);
  return jsonb_build_object('status','matched','match_id',v_match,'mode',p_mode,'level',p_level,'format',p_format);
end; $$;

-- Retain the exact old signature. No default third argument (PostgREST overload ambiguity).
create or replace function public.join_matchmaking(p_mode text,p_level text)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select public.join_matchmaking(p_mode,p_level,'words');
$$;
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
  return public.join_matchmaking(v_queue.mode,v_queue.level,v_queue.format);
end; $$;

create or replace function public.get_match_state(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_match public.matches; v_now timestamptz := clock_timestamp(); v_index integer;
  v_word text; v_players jsonb; v_answers jsonb; v_rounds integer; v_seconds integer;
begin
  if auth.uid() is null or not exists(select 1 from public.match_players where match_id=p_match_id and user_id=auth.uid()) then
    raise exception 'Нет доступа к матчу';
  end if;
  select * into v_match from public.matches where id=p_match_id;
  v_rounds := case when v_match.format='sentences' then 5 else 10 end;
  v_seconds := case when v_match.format='sentences' then 35 else 12 end;
  v_index := floor(extract(epoch from (v_now-v_match.starts_at))/v_seconds)::integer;
  if v_index>=0 and v_index<v_rounds and v_match.status='playing' then
    select w.word into v_word from public.match_rounds r join public.words w on w.id=r.word_id
      where r.match_id=p_match_id and r.round_index=v_index;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'username',p.username,'rating',mp.rating_before,
    'rating_before',mp.rating_before,'rating_after',mp.rating_after,'rating_change',coalesce(mp.rating_after-mp.rating_before,0),
    'score',mp.score,'correct',mp.correct,
    'accuracy',case when v_match.format='sentences' then round(mp.score::numeric/v_rounds)::integer else null end,
    'current_accuracy',(select a.accuracy from public.answers a where a.match_id=p_match_id and a.user_id=p.id and a.round_index=v_index),
    'answered_current',exists(select 1 from public.answers a where a.match_id=p_match_id and a.user_id=p.id and a.round_index=v_index))
    order by case when v_match.format='sentences' then mp.score else mp.correct end desc,mp.score desc,p.username), '[]'::jsonb)
    into v_players from public.match_players mp join public.profiles p on p.id=mp.user_id where mp.match_id=p_match_id;
  select coalesce(jsonb_agg(jsonb_build_object('index',r.round_index,'answer',coalesce(a.answer,''),'word',w.word,
    'correct',coalesce(a.correct,false),'points',coalesce(a.points,0),
    'accuracy',case when v_match.format='sentences' then coalesce(a.accuracy,0) else a.accuracy end)
    order by r.round_index),'[]'::jsonb) into v_answers
    from public.match_rounds r join public.words w on w.id=r.word_id
    left join public.answers a on a.match_id=r.match_id and a.round_index=r.round_index and a.user_id=auth.uid()
    where r.match_id=p_match_id and (r.round_index<v_index or a.user_id is not null or v_match.status='finished');
  return jsonb_build_object('id',v_match.id,'mode',v_match.mode,'level',v_match.level,'format',v_match.format,
    'status',case when v_match.status='finished' then 'finished' when v_now<v_match.starts_at then 'countdown' when v_now>=v_match.ends_at then 'ended' else 'playing' end,
    'starts_at',v_match.starts_at,'ends_at',v_match.ends_at,'server_now',v_now,
    'round_index',v_index,'round_count',v_rounds,'round_seconds',v_seconds,
    'challenge',case when v_word is null then null else jsonb_build_object('index',v_index,'word',v_word) end,
    'players',v_players,'results',v_players,'answers',v_answers);
end; $$;

create or replace function public.submit_match_answer(p_match_id uuid,p_round_index integer,p_answer text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_match public.matches; v_word text; v_now timestamptz; v_elapsed integer;
  v_correct boolean; v_points integer; v_score integer; v_user uuid := auth.uid();
  v_rounds integer; v_seconds integer; v_accuracy integer; v_answer text;
begin
  if v_user is null then raise exception 'Сначала войдите в аккаунт'; end if;
  select * into v_match from public.matches where id=p_match_id for update;
  if v_match.id is null or not exists(select 1 from public.match_players where match_id=p_match_id and user_id=v_user) then
    raise exception 'Нет доступа к матчу';
  end if;
  v_rounds := case when v_match.format='sentences' then 5 else 10 end;
  v_seconds := case when v_match.format='sentences' then 35 else 12 end;
  v_now := clock_timestamp();
  if p_round_index is null or p_round_index<0 or p_round_index>=v_rounds or v_match.status<>'playing' or v_now>=v_match.ends_at
    or v_now<v_match.starts_at+p_round_index*v_seconds*interval '1 second'
    or v_now>=v_match.starts_at+(p_round_index+1)*v_seconds*interval '1 second' then raise exception 'Время ответа истекло'; end if;
  if p_answer is null or (case when v_match.format='sentences' then char_length(p_answer)>500 else char_length(trim(p_answer))>64 end)
    or char_length(trim(p_answer))=0 then raise exception 'Введите слово или предложение допустимой длины'; end if;
  if exists(select 1 from public.answers where match_id=p_match_id and user_id=v_user and round_index=p_round_index) then
    raise exception 'Ответ уже отправлен';
  end if;
  select w.word into v_word from public.match_rounds r join public.words w on w.id=r.word_id
    where r.match_id=p_match_id and r.round_index=p_round_index;
  v_elapsed := greatest(0,floor(extract(epoch from (v_now-v_match.starts_at-p_round_index*v_seconds*interval '1 second'))*1000)::integer);
  v_answer := lower(trim(p_answer));
  if v_match.format='sentences' then
    v_accuracy := public.sentence_accuracy(p_answer,v_word);
    v_correct := public.normalize_sentence(p_answer)=public.normalize_sentence(v_word);
    v_points := v_accuracy;
  else
    v_correct := v_answer=lower(v_word);
    v_points := case when v_correct then 100+greatest(0,floor(50*(1-v_elapsed/12000.0))::integer) else 0 end;
  end if;
  insert into public.answers(match_id,user_id,round_index,answer,correct,points,elapsed_ms,accuracy)
    values(p_match_id,v_user,p_round_index,v_answer,v_correct,v_points,v_elapsed,v_accuracy);
  update public.match_players set score=score+v_points,correct=correct+case when v_correct then 1 else 0 end
    where match_id=p_match_id and user_id=v_user returning score into v_score;
  return jsonb_build_object('correct',v_correct,'points',v_points,'score',v_score,'accuracy',v_accuracy,'word',v_word,'answer',v_answer);
end; $$;

create or replace function public.finish_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_match public.matches; v_player record; v_delta integer; v_rating integer;
  v_best integer; v_best_score integer; v_field text; v_won boolean;
begin
  if auth.uid() is null or not exists(select 1 from public.match_players where match_id=p_match_id and user_id=auth.uid()) then
    raise exception 'Нет доступа к матчу';
  end if;
  perform pg_advisory_xact_lock(78123456);
  select * into v_match from public.matches where id=p_match_id for update;
  if v_match.status='finished' then return public.get_match_state(p_match_id); end if;
  if clock_timestamp()<v_match.ends_at then raise exception 'Матч еще не завершен'; end if;
  select correct,score into v_best,v_best_score from public.match_players where match_id=p_match_id
    order by case when v_match.format='sentences' then score else correct end desc,score desc limit 1;
  v_field := 'rating_' || case when v_match.format='sentences' then 'sentence_' else '' end || lower(v_match.level);
  for v_player in select * from public.match_players where match_id=p_match_id order by user_id loop
    select round(32*avg(
      case when v_match.format='sentences' then
        case when v_player.score>opponent.score then 1.0 when v_player.score=opponent.score then 0.5 else 0.0 end
      else case when (v_player.correct,v_player.score)>(opponent.correct,opponent.score) then 1.0
        when (v_player.correct,v_player.score)=(opponent.correct,opponent.score) then 0.5 else 0.0 end end
      -1.0/(1.0+power(10.0,(opponent.rating_before-v_player.rating_before)/400.0))
    ))::integer into v_delta from public.match_players opponent
      where opponent.match_id=p_match_id and opponent.user_id<>v_player.user_id;
    v_won := v_player.score=v_best_score and v_best_score>0 and
      (case when v_match.format='sentences' then
        (select count(*)=1 from public.match_players where match_id=p_match_id and score=v_best_score)
      else v_player.correct=v_best end);
    execute format('update public.profiles set %I=greatest(100,%I+$1),%I=%I+1,%I=%I+$2 where id=$3 returning %I',
      v_field,v_field,case when v_match.format='sentences' then 'games_sentence' else 'games' end,
      case when v_match.format='sentences' then 'games_sentence' else 'games' end,
      case when v_match.format='sentences' then 'wins_sentence' else 'wins' end,
      case when v_match.format='sentences' then 'wins_sentence' else 'wins' end,v_field)
      into v_rating using v_delta,case when v_won then 1 else 0 end,v_player.user_id;
    update public.match_players set rating_after=v_rating where match_id=p_match_id and user_id=v_player.user_id;
  end loop;
  update public.matches set status='finished' where id=p_match_id;
  return public.get_match_state(p_match_id);
end; $$;
revoke all on function public.join_matchmaking(text,text,text),public.join_matchmaking(text,text),
  public.poll_matchmaking(),public.get_match_state(uuid),public.submit_match_answer(uuid,integer,text),public.finish_match(uuid) from public,anon;
grant execute on function public.join_matchmaking(text,text,text),public.join_matchmaking(text,text),
  public.poll_matchmaking(),public.get_match_state(uuid),public.submit_match_answer(uuid,integer,text),public.finish_match(uuid) to authenticated;
-- BEGIN SENTENCE SEED
-- Generated from 10Qadam's original learning prompts; twelve per level A1-C1.
insert into public.words(level,word,kind) values
('A1','My sister likes yellow flowers.','sentences'),
('A1','There is a rabbit in the garden.','sentences'),
('A1','We have breakfast at seven.','sentences'),
('A1','Please open the small window.','sentences'),
('A1','My father is a teacher.','sentences'),
('A1','The water is on the table.','sentences'),
('A1','I play football with my brother.','sentences'),
('A1','Our house has a blue door.','sentences'),
('A1','She drinks milk every morning.','sentences'),
('A1','Today is my friend''s birthday.','sentences'),
('A1','The children are happy at school.','sentences'),
('A1','I can''t find my orange bag.','sentences'),
('A2','We usually walk to the supermarket together.','sentences'),
('A2','The weather was wonderful during our holiday.','sentences'),
('A2','Could you explain the question again?','sentences'),
('A2','My neighbour invited us to dinner yesterday.','sentences'),
('A2','This restaurant is cheaper than the other one.','sentences'),
('A2','Don''t forget to bring a bottle of water.','sentences'),
('A2','She has already finished her homework.','sentences'),
('A2','We decided to visit the village next weekend.','sentences'),
('A2','Learning a language takes time and practice.','sentences'),
('A2','Please send me a message when you arrive.','sentences'),
('A2','The journey was long but very interesting.','sentences'),
('A2','I borrowed an interesting book from my friend.','sentences'),
('B1','Although it was raining, we continued our walk through the park.','sentences'),
('B1','She has been learning English since she moved to the city.','sentences'),
('B1','If you practise regularly, your confidence will gradually improve.','sentences'),
('B1','The teacher suggested a different way to solve the problem.','sentences'),
('B1','I would rather travel by train than spend hours at the airport.','sentences'),
('B1','We were surprised by how friendly everyone was in the village.','sentences'),
('B1','Before making a choice, think about what matters most to you.','sentences'),
('B1','The book that you recommended helped me understand the subject.','sentences'),
('B1','He missed the bus because he had forgotten to set his alarm.','sentences'),
('B1','Taking short breaks can help you concentrate for longer.','sentences'),
('B1','We need to find a solution that works for the whole team.','sentences'),
('B1','This opportunity has given me a chance to develop new skills.','sentences'),
('B2','Despite the initial difficulties, the project turned out to be a success.','sentences'),
('B2','The decision was based on evidence rather than personal assumptions.','sentences'),
('B2','Had we left a little earlier, we would have avoided the traffic.','sentences'),
('B2','It is essential to consider the consequences before introducing major changes.','sentences'),
('B2','She managed to maintain a positive attitude throughout the competition.','sentences'),
('B2','The proposal sounds promising, but we should examine it more carefully.','sentences'),
('B2','Working with people from different backgrounds can broaden your perspective.','sentences'),
('B2','Even though resources were limited, the team delivered an efficient solution.','sentences'),
('B2','The report emphasises the importance of sustainable development in growing cities.','sentences'),
('B2','You are unlikely to make progress unless you are willing to accept feedback.','sentences'),
('B2','What impressed me most was their ability to adapt to unexpected circumstances.','sentences'),
('B2','The task was challenging; nevertheless, everyone agreed it was worth the effort.','sentences'),
('C1','The ambiguity of the original statement gave rise to several conflicting interpretations.','sentences'),
('C1','Only after scrutinising the data did the researchers identify a substantial discrepancy.','sentences'),
('C1','Her meticulous preparation enabled her to respond convincingly to even the most challenging questions.','sentences'),
('C1','While the proposal is theoretically feasible, its practical implications remain uncertain.','sentences'),
('C1','The committee acknowledged the inherent limitations of relying solely on preliminary findings.','sentences'),
('C1','A comprehensive understanding of the issue requires attention to its less obvious nuances.','sentences'),
('C1','Notwithstanding their differences, both approaches rest on the same implicit assumption.','sentences'),
('C1','What initially appeared to be an isolated incident revealed a far more pervasive problem.','sentences'),
('C1','The organisation remained resilient despite facing an unprecedented series of setbacks.','sentences'),
('C1','Rather than dismissing the criticism, she incorporated it into a more coherent argument.','sentences'),
('C1','Any tentative conclusion should be treated with caution until independent evidence becomes available.','sentences'),
('C1','The compelling account challenged our assumptions without oversimplifying the complexity of the situation.','sentences')
on conflict(level,word) do nothing;
-- END SENTENCE SEED
-- END SENTENCE BATTLES
notify pgrst, 'reload schema';
commit;
