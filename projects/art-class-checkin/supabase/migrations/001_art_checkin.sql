-- Additive. Production requires the repository's explicit migration approval.
-- No existing Differance Labs tables are altered.
create schema if not exists art_checkin;
revoke all on schema art_checkin from public, anon, authenticated;

create table art_checkin.environment (
  singleton boolean primary key default true check (singleton),
  id uuid not null default gen_random_uuid(),
  kind text not null default 'unconfigured' check (kind in ('unconfigured','demo','live')),
  business_name text not null default 'Art Class Check-In',
  timezone text not null default 'America/Chicago',
  schema_version integer not null default 1
);
insert into art_checkin.environment default values;
create table art_checkin.students (
  id uuid primary key default gen_random_uuid(), data jsonb not null, version integer not null default 1
);
create table art_checkin.adults (
  id uuid primary key default gen_random_uuid(), data jsonb not null, version integer not null default 1
);
create table art_checkin.permissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references art_checkin.students,
  adult_id uuid not null references art_checkin.adults,
  approved boolean not null, relationship text not null default '',
  note text not null, changed_at timestamptz not null default now(),
  version integer not null default 1, unique(student_id,adult_id)
);
create table art_checkin.classes (
  id uuid primary key default gen_random_uuid(), data jsonb not null, version integer not null default 1
);
create table art_checkin.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references art_checkin.classes,
  date date not null, snapshot jsonb not null,
  created_by text not null, created_at timestamptz not null default now(),
  unique(class_id,date)
);
create table art_checkin.roster (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references art_checkin.class_sessions,
  student_id uuid not null references art_checkin.students,
  student_snapshot jsonb not null,
  status text not null default 'Expected' check (status in ('Expected','Present','Released','Absent')),
  arrival_at timestamptz, departure_at timestamptz, release jsonb,
  attendance_version integer not null default 0,
  payment_version integer not null default 0,
  payment jsonb not null default '{"confirmed":false}',
  unique(session_id,student_id),
  check (departure_at is null or (arrival_at is not null and departure_at >= arrival_at)),
  check ((status = 'Released') = (departure_at is not null))
);
create table art_checkin.events (
  id uuid primary key default gen_random_uuid(), sequence bigserial unique,
  operation_id uuid not null, actor text not null,
  subject_id uuid, roster_id uuid references art_checkin.roster,
  kind text not null, before_value jsonb, after_value jsonb,
  actual_at timestamptz not null, recorded_at timestamptz not null default now(),
  source text not null default 'Digital', reason text
);
create index on art_checkin.events(roster_id,sequence);
create index on art_checkin.events(subject_id,actual_at);
create table art_checkin.sessions (
  token_hash text primary key, email text not null,
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now(), revoked boolean not null default false
);
create table art_checkin.nonces (nonce_hash text primary key, expires_at timestamptz not null);
create table art_checkin.operations (
  id uuid primary key, actor text not null, fingerprint text not null, result jsonb,
  created_at timestamptz not null default now()
);
create table art_checkin.backups (
  id uuid primary key default gen_random_uuid(), snapshot jsonb not null,
  created_at timestamptz not null default now(), created_by text not null
);
create table art_checkin.devices (
  verifier_hash text primary key, code text not null unique,
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  approved_email text, consumed boolean not null default false
);
create table art_checkin.rate_limits (
  key text primary key, window_start timestamptz not null default now(), attempts integer not null default 0
);

-- RLS is a second boundary: no anon/authenticated policies or direct grants.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='art_checkin' loop
    execute format('alter table art_checkin.%I enable row level security',t.tablename);
    execute format('revoke all on art_checkin.%I from public, anon, authenticated, service_role',t.tablename);
  end loop;
end $$;

create function art_checkin.immutable_event() returns trigger language plpgsql as $$
begin raise exception using errcode='PT403',message='Audit events cannot be changed or deleted.'; end $$;
create trigger events_immutable before update or delete on art_checkin.events
for each row execute function art_checkin.immutable_event();

create function public.art_identity() returns jsonb
language sql security definer set search_path='' as $$
  select to_jsonb(e) from art_checkin.environment e;
$$;

create function art_checkin.grant_for(p_email text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.app_grants; a public.apps;
begin
  select * into a from public.apps where slug='art-class-checkin' for share;
  if not found or a.status <> 'active' then
    raise exception using errcode='PT403', message='App access is unavailable.';
  end if;
  select * into g from public.app_grants
    where user_email=lower(p_email) and app_slug='art-class-checkin' for share;
  if not found or g.role not in ('member','staff','admin') then
    raise exception using errcode='PT403',message='Your access to this app has been revoked or is not granted.';
  end if;
  return jsonb_build_object('email',lower(p_email),'role',case when g.role='admin' then 'admin' else 'staff' end);
end $$;

create function art_checkin.actor(p_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s art_checkin.sessions;
begin
  select * into s from art_checkin.sessions where token_hash=p_hash for share;
  if not found or s.revoked or s.expires_at <= now() then
    raise exception using errcode='PT401',message='Sign in again to continue.';
  end if;
  return art_checkin.grant_for(s.email);
end $$;

create function public.art_auth(p_action text, p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e art_checkin.environment; u jsonb; d art_checkin.devices; v_email text;
begin
  select * into e from art_checkin.environment;
  if p_action in ('exchange','demo') then
    if p_action='demo' then
      if e.kind <> 'demo' or p_input->>'email' not in ('staff@art-demo.invalid','admin@art-demo.invalid') then
        raise exception using errcode='PT403',message='Demo login is unavailable.';
      end if;
    else
      if e.kind not in ('demo','live') or (p_input->>'expiresAt')::timestamptz <= now()
         or (p_input->>'expiresAt')::timestamptz > now()+interval '3 minutes' then
        raise exception using errcode='PT401',message='This sign-in link has expired.';
      end if;
      insert into art_checkin.nonces values(p_input->>'nonceHash',(p_input->>'expiresAt')::timestamptz)
        on conflict do nothing;
      if not found then raise exception using errcode='PT409',message='This sign-in link was already used. Launch the app again.'; end if;
    end if;
    u := art_checkin.grant_for(p_input->>'email');
    insert into art_checkin.sessions(token_hash,email) values(p_input->>'sessionHash',u->>'email');
    return u;
  elsif p_action='logout' then
    update art_checkin.sessions set revoked=true where token_hash=p_input->>'sessionHash';
    return '{"ok":true}';
  elsif p_action='device-start' then
    insert into art_checkin.devices(verifier_hash,code) values(p_input->>'verifierHash',p_input->>'code');
    return jsonb_build_object('code',p_input->>'code','expiresIn',300);
  elsif p_action='device-approve' then
    u := art_checkin.actor(p_input->>'sessionHash');
    update art_checkin.devices set approved_email=u->>'email'
      where code=p_input->>'code' and expires_at>now() and not consumed and approved_email is null;
    if not found then raise exception using errcode='PT422',message='The device code is invalid, expired, or already approved.'; end if;
    return '{"ok":true}';
  elsif p_action='device-finish' then
    select * into d from art_checkin.devices where verifier_hash=p_input->>'verifierHash' for update;
    if not found or d.expires_at<=now() or d.consumed then
      raise exception using errcode='PT401',message='Device sign-in expired. Start again.';
    end if;
    if d.approved_email is null then return '{"pending":true}'; end if;
    u:=art_checkin.grant_for(d.approved_email);
    insert into art_checkin.sessions(token_hash,email) values(p_input->>'sessionHash',d.approved_email);
    update art_checkin.devices set consumed=true where verifier_hash=d.verifier_hash;
    return u;
  end if;
  raise exception using errcode='PT422',message='Unknown authentication operation.';
end $$;

create function public.art_rate_limit(p_key text,p_limit integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  insert into art_checkin.rate_limits(key,attempts) values(p_key,1)
  on conflict(key) do update set
    attempts=case when art_checkin.rate_limits.window_start < now()-interval '1 minute' then 1 else art_checkin.rate_limits.attempts+1 end,
    window_start=case when art_checkin.rate_limits.window_start < now()-interval '1 minute' then now() else art_checkin.rate_limits.window_start end
  returning attempts into n;
  return n<=p_limit;
end $$;

create function art_checkin.session_snapshot(p_id uuid) returns jsonb
language sql security definer set search_path='' as $$
select jsonb_build_object(
  'session',to_jsonb(s),
  'roster',coalesce((select jsonb_agg(to_jsonb(r) order by r.student_snapshot->>'name') from art_checkin.roster r where r.session_id=s.id),'[]'::jsonb),
  'students',coalesce((select jsonb_agg(to_jsonb(st)) from art_checkin.students st where st.id in (select student_id from art_checkin.roster where session_id=s.id)),'[]'::jsonb),
  'adults',coalesce((select jsonb_agg(to_jsonb(a)) from art_checkin.adults a where a.id in (select adult_id from art_checkin.permissions where student_id in (select student_id from art_checkin.roster where session_id=s.id))),'[]'::jsonb),
  'permissions',coalesce((select jsonb_agg(to_jsonb(p)) from art_checkin.permissions p where p.student_id in (select student_id from art_checkin.roster where session_id=s.id)),'[]'::jsonb),
  'business',(select business_name from art_checkin.environment),
  'printedAt',now()
) from art_checkin.class_sessions s where s.id=p_id;
$$;

create function public.art_read(p_session text,p_action text,p_input jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u jsonb; result jsonb;
begin
  u:=art_checkin.actor(p_session);
  if p_action='bootstrap' then
    return jsonb_build_object('user',u,'settings',public.art_identity(),
      'students',coalesce((select jsonb_agg(to_jsonb(s) order by s.data->>'name') from art_checkin.students s),'[]'::jsonb),
      'adults',coalesce((select jsonb_agg(to_jsonb(a) order by a.data->>'name') from art_checkin.adults a),'[]'::jsonb),
      'permissions',coalesce((select jsonb_agg(to_jsonb(p)) from art_checkin.permissions p),'[]'::jsonb),
      'classes',coalesce((select jsonb_agg(to_jsonb(c) order by c.data->>'name') from art_checkin.classes c),'[]'::jsonb),
      'sessions',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('present_count',(select count(*) from art_checkin.roster r where r.session_id=s.id and r.status='Present')) order by s.date desc) from art_checkin.class_sessions s),'[]'::jsonb),
      'staff',case when u->>'role'='admin' then coalesce((select jsonb_agg(jsonb_build_object('email',g.user_email,'role',g.role)) from public.app_grants g where g.app_slug='art-class-checkin'),'[]'::jsonb) else '[]'::jsonb end);
  elsif p_action='session' then
    result:=art_checkin.session_snapshot((p_input->>'id')::uuid);
  elsif p_action='operation' then
    select o.result into result from art_checkin.operations o where o.id=(p_input->>'id')::uuid and o.actor=u->>'email';
    return coalesce(result,'{"pending":true}'::jsonb);
  elsif p_action='backup' then
    select snapshot into result from art_checkin.backups where id=(p_input->>'id')::uuid;
  elsif p_action='adult' then
    select to_jsonb(a) into result from art_checkin.adults a where id=(p_input->>'id')::uuid;
  elsif p_action='history' then
    select coalesce(jsonb_agg(x.row),'[]'::jsonb) into result from (
      select to_jsonb(r)||jsonb_build_object('session',to_jsonb(s),
        'events',coalesce((select jsonb_agg(to_jsonb(ev) order by ev.sequence) from art_checkin.events ev where ev.roster_id=r.id),'[]'::jsonb)) as row
      from art_checkin.roster r join art_checkin.class_sessions s on s.id=r.session_id
      where (coalesce(p_input->>'student','')='' or r.student_id::text=p_input->>'student')
        and (coalesce(p_input->>'class','')='' or s.class_id::text=p_input->>'class')
        and (coalesce(p_input->>'session','')='' or s.id::text=p_input->>'session')
        and (coalesce(p_input->>'from','')='' or s.date >= (p_input->>'from')::date)
        and (coalesce(p_input->>'to','')='' or s.date <= (p_input->>'to')::date)
        and (coalesce(p_input->>'paid','')='' or (r.payment->>'confirmed')::boolean=(p_input->>'paid')::boolean)
      order by s.date desc,r.id limit least(coalesce((p_input->>'limit')::integer,100),1000)
      offset greatest(coalesce((p_input->>'offset')::integer,0),0)
    ) x;
  elsif p_action='audit' then
    if u->>'role'<>'admin' then raise exception using errcode='PT403',message='App administrator access required.'; end if;
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from
      (select * from art_checkin.events order by sequence desc limit 200) x;
  else
    raise exception using errcode='PT422',message='Unknown read operation.';
  end if;
  if result is null then raise exception using errcode='PT404',message='Record not found.'; end if;
  return result;
end $$;

create function public.art_write(p_session text,p_operation uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  u jsonb; old jsonb; saved_result jsonb; after_data jsonb; operation art_checkin.operations;
  r art_checkin.roster; p art_checkin.permissions; a art_checkin.adults; st art_checkin.students;
  cls art_checkin.classes; cs art_checkin.class_sessions; identifier uuid;
  prior_version integer; required_version integer; event_kind text:=p_action; subject uuid;
  occurred timestamptz:=now(); source_name text:='Digital'; note text:=nullif(trim(p_input->>'reason'),'');
  arrival timestamptz; departure timestamptz; pickup jsonb; pay jsonb;
  historical jsonb; action_fingerprint text; admin_override boolean:=false; target_status text;
begin
  u:=art_checkin.actor(p_session);
  action_fingerprint:=md5(p_action||p_input::text);
  insert into art_checkin.operations(id,actor,fingerprint) values(p_operation,u->>'email',action_fingerprint)
    on conflict do nothing;
  if not found then
    select * into operation from art_checkin.operations where id=p_operation;
    if operation.actor<>u->>'email' or operation.fingerprint<>action_fingerprint then
      raise exception using errcode='PT409',message='This request ID belongs to a different change.';
    end if;
    return operation.result;
  end if;
  if p_action in ('student.save','adult.save','permission.set','class.save','settings.save','staff.role','attendance.correct')
     and u->>'role'<>'admin' then
    raise exception using errcode='PT403',message='App administrator access required.';
  end if;
  identifier:=coalesce(nullif(p_input->>'id','')::uuid,gen_random_uuid());
  subject:=identifier;
  required_version:=coalesce((p_input->>'version')::integer,0);

  if p_action in ('student.save','adult.save','class.save') then
    if p_action='student.save' then select data,version into old,prior_version from art_checkin.students where id=identifier for update;
    elsif p_action='adult.save' then select data,version into old,prior_version from art_checkin.adults where id=identifier for update;
    else select data,version into old,prior_version from art_checkin.classes where id=identifier for update; end if;
    if coalesce(prior_version,0)<>required_version then raise exception using errcode='PT409',message='This record changed on another device. Reload before editing.'; end if;
    after_data:=p_input->'data';
    if length(trim(after_data->>'name'))=0 or length(after_data->>'name')>160 then raise exception using errcode='PT422',message='A name of up to 160 characters is required.'; end if;
    if p_action='class.save' and exists (
      select 1 from jsonb_array_elements_text(after_data->'studentIds') x(id)
      where not exists(select 1 from art_checkin.students s where s.id=x.id::uuid and not coalesce((s.data->>'archived')::boolean,false))
    ) then raise exception using errcode='PT422',message='The roster includes a missing or archived student.'; end if;
    if p_action='student.save' then
      insert into art_checkin.students values(identifier,after_data,1) on conflict(id) do update set data=excluded.data,version=art_checkin.students.version+1;
    elsif p_action='adult.save' then
      -- Photo keys are changed only through the server's photo action.
      after_data:=after_data - 'photoPath' || jsonb_build_object('photoPath',old->'photoPath');
      insert into art_checkin.adults values(identifier,after_data,1) on conflict(id) do update set data=excluded.data,version=art_checkin.adults.version+1;
    else
      insert into art_checkin.classes values(identifier,after_data,1) on conflict(id) do update set data=excluded.data,version=art_checkin.classes.version+1;
    end if;
  elsif p_action='adult.photo' then
    if u->>'role'<>'admin' then raise exception using errcode='PT403',message='App administrator access required.'; end if;
    select * into a from art_checkin.adults where id=identifier for update;
    if not found then raise exception using errcode='PT404',message='Adult not found.'; end if;
    if a.version<>required_version then raise exception using errcode='PT409',message='Adult details changed. Reload before uploading.'; end if;
    old:=a.data; after_data:=a.data||jsonb_build_object('photoPath',p_input->>'photoPath');
    update art_checkin.adults set data=after_data,version=version+1 where id=identifier;
  elsif p_action='permission.set' then
    select * into st from art_checkin.students where id=(p_input->>'studentId')::uuid for share;
    if not found or coalesce(st.data->>'guardianPhone','')='' then raise exception using errcode='PT422',message='Save the parent contact on file before changing pickup permission.'; end if;
    if length(trim(coalesce(p_input->>'note','')))<3 then raise exception using errcode='PT422',message='An authorization confirmation note is required.'; end if;
    select * into p from art_checkin.permissions where student_id=st.id and adult_id=(p_input->>'adultId')::uuid for update;
    if coalesce(p.version,0)<>required_version then raise exception using errcode='PT409',message='Pickup permission changed. Reload before editing.'; end if;
    old:=case when p.id is null then null else to_jsonb(p) end;
    identifier:=coalesce(p.id,identifier); subject:=identifier;
    insert into art_checkin.permissions(id,student_id,adult_id,approved,relationship,note)
      values(identifier,st.id,(p_input->>'adultId')::uuid,(p_input->>'approved')::boolean,p_input->>'relationship',p_input->>'note')
      on conflict(student_id,adult_id) do update set approved=excluded.approved,relationship=excluded.relationship,
        note=excluded.note,changed_at=now(),version=art_checkin.permissions.version+1;
    select to_jsonb(x) into after_data from art_checkin.permissions x where id=identifier;
    note:=p_input->>'note';
  elsif p_action='session.create' then
    select * into cls from art_checkin.classes where id=(p_input->>'classId')::uuid for share;
    if not found or coalesce((cls.data->>'archived')::boolean,false) then raise exception using errcode='PT422',message='Choose an active class.'; end if;
    insert into art_checkin.class_sessions(id,class_id,date,snapshot,created_by)
      values(identifier,cls.id,(p_input->>'date')::date,
        jsonb_build_object('name',cls.data->>'name','instructor',cls.data->>'instructor','timezone',(select timezone from art_checkin.environment)),u->>'email');
    insert into art_checkin.roster(session_id,student_id,student_snapshot)
      select identifier,s.id,s.data from art_checkin.students s
      where s.id in (select value::uuid from jsonb_array_elements_text(cls.data->'studentIds'))
        and not coalesce((s.data->>'archived')::boolean,false);
    after_data:=art_checkin.session_snapshot(identifier);
  elsif p_action='settings.save' then
    if not exists(select 1 from pg_timezone_names where name=p_input->>'timezone') then raise exception using errcode='PT422',message='Choose a valid IANA timezone.'; end if;
    old:=public.art_identity();
    update art_checkin.environment set business_name=p_input->>'businessName',timezone=p_input->>'timezone';
    after_data:=public.art_identity();
  elsif p_action='staff.role' then
    if p_input->>'role' not in ('staff','admin') then raise exception using errcode='PT422',message='Invalid app role.'; end if;
    if lower(p_input->>'email')=u->>'email' then raise exception using errcode='PT422',message='Another app administrator must change your own role.'; end if;
    select jsonb_build_object('email',g.user_email,'role',g.role) into old from public.app_grants g
      where g.app_slug='art-class-checkin' and g.user_email=lower(p_input->>'email') for update;
    if not found then raise exception using errcode='PT422',message='Grant app access in the Differance Labs portal first.'; end if;
    if note is null then raise exception using errcode='PT422',message='A reason is required.'; end if;
    update public.app_grants set role=p_input->>'role' where app_slug='art-class-checkin' and user_email=lower(p_input->>'email');
    after_data:=jsonb_build_object('email',lower(p_input->>'email'),'role',p_input->>'role');
  elsif p_action='backup.create' then
    after_data:=art_checkin.session_snapshot((p_input->>'sessionId')::uuid);
    if after_data is null then raise exception using errcode='PT404',message='Session not found.'; end if;
    after_data:=after_data||jsonb_build_object('backupId',identifier,'printedBy',u->>'email');
    insert into art_checkin.backups(id,snapshot,created_by) values(identifier,after_data,u->>'email');
  elsif p_action in ('attendance.checkin','attendance.absent','attendance.release','attendance.correct','payment.set','paper.reconcile') then
    select * into r from art_checkin.roster where id=identifier for update;
    if not found then raise exception using errcode='PT404',message='Student session record not found.'; end if;
    old:=to_jsonb(r);
    if p_action='payment.set' then
      if r.payment_version<>required_version then raise exception using errcode='PT409',message='Payment changed on another device. Reload and compare before saving.'; end if;
      if (r.payment->>'confirmed')::boolean and note is null then raise exception using errcode='PT422',message='A reason is required to clear or correct a confirmation.'; end if;
      pay:=p_input->'payment';
      if pay->>'amountCents' is not null and (pay->>'amountCents')::bigint<0 then raise exception using errcode='PT422',message='Amount cannot be negative.'; end if;
      pay:=pay||jsonb_build_object('confirmedBy',u->>'email','confirmedAt',case when (pay->>'confirmed')::boolean then now() else null end,'recordedAt',now(),'source','Digital');
      update art_checkin.roster set payment=pay,payment_version=payment_version+1 where id=r.id;
    else
      if r.attendance_version<>required_version then raise exception using errcode='PT409',message='Attendance changed on another device. Reload before continuing.'; end if;
      if p_action='attendance.checkin' then
        if r.status not in ('Expected','Absent') then raise exception using errcode='PT409',message='This child is already checked in or released.'; end if;
        update art_checkin.roster set status='Present',arrival_at=now(),attendance_version=attendance_version+1 where id=r.id;
      elsif p_action='attendance.absent' then
        if r.status<>'Expected' then raise exception using errcode='PT409',message='Only an expected child can be marked absent.'; end if;
        update art_checkin.roster set status='Absent',attendance_version=attendance_version+1 where id=r.id;
      elsif p_action='attendance.release' then
        if r.status<>'Present' then raise exception using errcode='PT409',message='Only a Present child can be released.'; end if;
        select * into p from art_checkin.permissions where id=(p_input->>'permissionId')::uuid and student_id=r.student_id for share;
        if not found or not p.approved then raise exception using errcode='PT409',message='This adult is not currently approved for this child.'; end if;
        select * into a from art_checkin.adults where id=p.adult_id for share;
        if p_input->>'verification' is null or p_input->>'verification' not in ('Known to staff','Photo ID checked') then raise exception using errcode='PT422',message='Choose a verification method.'; end if;
        pickup:=jsonb_build_object('adultId',a.id,'name',a.data->>'name','phone',a.data->>'phone','relationship',p.relationship,
          'permissionId',p.id,'authorization',to_jsonb(p),'verification',p_input->>'verification','staff',u->>'email');
        update art_checkin.roster set status='Released',departure_at=now(),release=pickup,attendance_version=attendance_version+1 where id=r.id;
      elsif p_action='attendance.correct' and p_input->>'status' in ('Expected','Absent','Present') then
        if note is null then raise exception using errcode='PT422',message='A correction reason is required.'; end if;
        arrival:=case when p_input->>'status'='Present' then (p_input->>'arrivalAt')::timestamptz else null end;
        if p_input->>'status'='Present' and (arrival is null or arrival>now()) then raise exception using errcode='PT422',message='Enter the actual arrival time.'; end if;
        update art_checkin.roster set status=p_input->>'status',arrival_at=arrival,departure_at=null,release=null,attendance_version=attendance_version+1 where id=r.id;
        occurred:=coalesce(arrival,now()); source_name:='Correction';
      else
        -- Paper reconciliation and corrections of historical released records.
        source_name:=case when p_action='attendance.correct' then 'Correction' else 'Paper' end;
        admin_override:=u->>'role'='admin' and note is not null;
        if p_action='attendance.correct' and not admin_override then raise exception using errcode='PT422',message='A correction reason is required.'; end if;
        arrival:=coalesce(nullif(p_input->>'arrivalAt','')::timestamptz,r.arrival_at);
        departure:=nullif(p_input->>'departureAt','')::timestamptz;
        if arrival>now() or departure>now() or (departure is not null and (arrival is null or departure<arrival)) then
          raise exception using errcode='PT422',message='Paper times must be in the past, with pickup after arrival.';
        end if;
        if (r.arrival_at is not null and arrival is not null and r.arrival_at<>arrival)
          or (r.departure_at is not null and departure is not null and r.departure_at<>departure) then
          if not admin_override then raise exception using errcode='PT409',message='Paper conflicts with saved attendance. An administrator must make an audited correction.'; end if;
        end if;
        pickup:=r.release;
        if departure is not null then
          select * into p from art_checkin.permissions where student_id=r.student_id and adult_id=(p_input->>'adultId')::uuid for share;
          select * into a from art_checkin.adults where id=(p_input->>'adultId')::uuid for share;
          if a.id is null then raise exception using errcode='PT422',message='Choose a recorded pickup adult.'; end if;
          select after_value into historical from art_checkin.events
            where kind='permission.set' and subject_id=p.id and actual_at<=departure order by sequence desc limit 1;
          if not coalesce((historical->>'approved')::boolean,false) and not admin_override then
            raise exception using errcode='PT409',message='Historical pickup authorization could not be confirmed. An administrator must document the past authorization.';
          end if;
          if p_input->>'verification' is null or p_input->>'verification' not in ('Known to staff','Photo ID checked') then raise exception using errcode='PT422',message='Choose the verification recorded on paper.'; end if;
          if r.release is not null and (r.release->>'adultId'<>a.id::text or r.release->>'verification' is distinct from p_input->>'verification') and not admin_override then
            raise exception using errcode='PT409',message='Paper pickup details conflict with the saved release. Ask an administrator to reconcile.';
          end if;
          pickup:=jsonb_build_object('adultId',a.id,'name',a.data->>'name','phone',a.data->>'phone','relationship',p.relationship,
            'authorization',historical,'verification',p_input->>'verification','recordedBy',u->>'email',
            'paperStaffInitials',p_input->>'staffInitials','authorizationNote',note);
          -- Re-entering the same paper handoff cannot create a second handoff or
          -- replace the identity / authorization snapshot of the original event.
          if r.departure_at=departure and r.release->>'adultId'=a.id::text
            and r.release->>'verification'=p_input->>'verification' and not admin_override then
            pickup:=r.release;
          end if;
        end if;
        arrival:=coalesce(arrival,r.arrival_at); departure:=coalesce(departure,r.departure_at);
        if arrival is not null then
          update art_checkin.roster set arrival_at=arrival,departure_at=departure,release=pickup,
            status=case when departure is not null then 'Released' else 'Present' end,
            attendance_version=attendance_version+case when r.arrival_at is distinct from arrival or r.departure_at is distinct from departure or r.release is distinct from pickup then 1 else 0 end
          where id=r.id;
        end if;
        occurred:=coalesce(departure,arrival,now());
        if coalesce((p_input->>'paid')::boolean,false) then
          if r.payment_version<>coalesce((p_input->>'paymentVersion')::integer,-1) then raise exception using errcode='PT409',message='Payment changed since this form opened. Reload and reconcile explicitly.'; end if;
          if (r.payment->>'confirmed')::boolean and not admin_override then
            raise exception using errcode='PT409',message='Payment is already confirmed. Keep it, or ask an administrator to reconcile conflicting paper details.';
          end if;
          if nullif(p_input->>'confirmedAt','')::timestamptz>now() then raise exception using errcode='PT422',message='Paper confirmation time cannot be in the future.'; end if;
          pay:=coalesce(p_input->'payment','{}'::jsonb)||jsonb_build_object('confirmed',true,'confirmedBy',u->>'email','recordedAt',now(),
            'confirmedAt',nullif(p_input->>'confirmedAt','')::timestamptz,'source','Paper','paperStaffInitials',p_input->>'staffInitials');
          update art_checkin.roster set payment=pay,payment_version=payment_version+1 where id=r.id;
        end if;
        -- An unchecked paper box deliberately does nothing to payment.
      end if;
    end if;
    select to_jsonb(x) into after_data from art_checkin.roster x where id=r.id;
  else
    raise exception using errcode='PT422',message='Unknown change.';
  end if;
  if old is distinct from after_data then
    insert into art_checkin.events(operation_id,actor,subject_id,roster_id,kind,before_value,after_value,actual_at,source,reason)
      values(p_operation,u->>'email',subject,r.id,event_kind,old,after_data,occurred,source_name,note);
  end if;
  saved_result:=jsonb_build_object('ok',true,'id',identifier,'operationId',p_operation,'recordedAt',now(),'value',after_data);
  update art_checkin.operations set result=saved_result where id=p_operation;
  return saved_result;
exception when unique_violation then
  raise exception using errcode='PT409',message='This session or record already exists. Reload to use the saved record.';
end $$;

-- Private photo bucket. Never expose public/signed object URLs to the browser.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('art-checkin-photos','art-checkin-photos',false,2097152,array['image/webp'])
on conflict(id) do nothing;

revoke all on all functions in schema art_checkin from public,anon,authenticated,service_role;
revoke all on function public.art_identity() from public,anon,authenticated;
revoke all on function public.art_auth(text,jsonb) from public,anon,authenticated;
revoke all on function public.art_rate_limit(text,integer) from public,anon,authenticated;
revoke all on function public.art_read(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.art_write(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.art_identity(),public.art_auth(text,jsonb),public.art_rate_limit(text,integer),
  public.art_read(text,text,jsonb),public.art_write(text,uuid,text,jsonb) to service_role;
