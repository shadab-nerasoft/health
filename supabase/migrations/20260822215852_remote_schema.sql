set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

create table "public"."coach_messages" (
  "id"         uuid                     not null default gen_random_uuid(),
  "user_id"    uuid                     not null,
  "role"       text                     not null,
  "content"    text                     not null,
  "created_at" timestamp with time zone not null default now(),
  constraint "coach_messages_pkey" primary key (id),
  constraint "coach_messages_role_check" check ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);

alter table "public"."coach_messages"
  enable row level security;

create table "public"."daily_activity" (
  "id"              uuid                     not null default gen_random_uuid(),
  "user_id"         uuid                     not null,
  "date"            date                     not null,
  "steps"           integer                  not null default 0,
  "distance_meters" numeric                  not null default 0,
  "active_minutes"  integer                  not null default 0,
  "calories_burned" numeric                  not null default 0,
  "source"          text                     not null default 'manual'::text,
  "created_at"      timestamp with time zone not null default now(),
  "updated_at"      timestamp with time zone not null default now(),
  constraint "daily_activity_active_minutes_check" check ((active_minutes >= 0)),
  constraint "daily_activity_calories_burned_check" check ((calories_burned >= (0)::numeric)),
  constraint "daily_activity_distance_meters_check" check ((distance_meters >= (0)::numeric)),
  constraint "daily_activity_pkey" primary key (id),
  constraint "daily_activity_steps_check" check ((steps >= 0)),
  constraint "daily_activity_user_id_date_key" unique (user_id, date)
);

alter table "public"."daily_activity"
  enable row level security;

create table "public"."goal_progress" (
  "id"         uuid                     not null default gen_random_uuid(),
  "goal_id"    uuid                     not null,
  "user_id"    uuid                     not null,
  "date"       date                     not null,
  "value"      numeric                  not null default 0,
  "created_at" timestamp with time zone not null default now(),
  constraint "goal_progress_goal_id_date_key" unique (goal_id, date),
  constraint "goal_progress_pkey" primary key (id),
  constraint "goal_progress_value_check" check ((value >= (0)::numeric))
);

alter table "public"."goal_progress"
  enable row level security;

create table "public"."goals" (
  "id"         uuid                     not null default gen_random_uuid(),
  "user_id"    uuid                     not null,
  "goal_type"  text                     not null,
  "target"     numeric                  not null,
  "period"     text                     not null default 'daily'::text,
  "active"     boolean                  not null default true,
  "created_at" timestamp with time zone not null default now(),
  constraint "goals_pkey" primary key (id),
  constraint "goals_target_check" check ((target > (0)::numeric))
);

alter table "public"."goals"
  enable row level security;

create table "public"."hydration_logs" (
  "id"        uuid                     not null default gen_random_uuid(),
  "user_id"   uuid                     not null,
  "logged_at" timestamp with time zone not null default now(),
  "amount_ml" integer                  not null,
  constraint "hydration_logs_amount_ml_check" check ((amount_ml > 0)),
  constraint "hydration_logs_pkey" primary key (id)
);

alter table "public"."hydration_logs"
  enable row level security;

create table "public"."insights" (
  "id"         uuid                     not null default gen_random_uuid(),
  "user_id"    uuid                     not null,
  "kind"       text                     not null,
  "title"      text                     not null,
  "body"       text                     not null,
  "created_at" timestamp with time zone not null default now(),
  constraint "insights_pkey" primary key (id)
);

alter table "public"."insights"
  enable row level security;

create table "public"."meal_plans" (
  "id"         uuid                     not null default gen_random_uuid(),
  "user_id"    uuid                     not null,
  "plan"       jsonb                    not null,
  "goal"       text                     not null default 'weight_loss'::text,
  "created_at" timestamp with time zone not null default now(),
  constraint "meal_plans_pkey" primary key (id)
);

alter table "public"."meal_plans"
  enable row level security;

create table "public"."profiles" (
  "id"                  uuid                     not null,
  "display_name"        text,
  "age"                 integer,
  "height_cm"           numeric,
  "weight_kg"           numeric,
  "activity_level"      text,
  "goal_type"           text,
  "step_goal"           integer                  not null default 10000,
  "onboarding_complete" boolean                  not null default false,
  "created_at"          timestamp with time zone not null default now(),
  "updated_at"          timestamp with time zone not null default now(),
  constraint "profiles_pkey" primary key (id)
);

alter table "public"."profiles"
  enable row level security;

create table "public"."push_subscriptions" (
  "id"         uuid                     not null default gen_random_uuid(),
  "endpoint"   text                     not null,
  "p256dh"     text                     not null,
  "auth"       text                     not null,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
  constraint "push_subscriptions_endpoint_key" unique (endpoint),
  constraint "push_subscriptions_pkey" primary key (id)
);

alter table "public"."push_subscriptions"
  enable row level security;

create table "public"."recommendations" (
  "id"           uuid                     not null default gen_random_uuid(),
  "user_id"      uuid                     not null,
  "kind"         text                     not null,
  "title"        text                     not null,
  "body"         text                     not null,
  "dismissed_at" timestamp with time zone,
  "created_at"   timestamp with time zone not null default now(),
  constraint "recommendations_pkey" primary key (id)
);

alter table "public"."recommendations"
  enable row level security;

create table "public"."weight_logs" (
  "id"        uuid                     not null default gen_random_uuid(),
  "user_id"   uuid                     not null,
  "logged_at" timestamp with time zone not null default now(),
  "weight_kg" numeric                  not null,
  constraint "weight_logs_pkey" primary key (id),
  constraint "weight_logs_weight_kg_check" check ((weight_kg > (0)::numeric))
);

alter table "public"."weight_logs"
  enable row level security;

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  AS $function$ begin insert into public.profiles (id,email,first_name,last_name) values (new.id,new.email,new.raw_user_meta_data ->> 'first_name',new.raw_user_meta_data ->> 'last_name') on conflict (id) do nothing; return new; end; $function$;

alter table "public"."coach_messages"
  add constraint "coach_messages_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."daily_activity"
  add constraint "daily_activity_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."goal_progress"
  add constraint "goal_progress_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."goal_progress"
  add constraint "goal_progress_goal_id_fkey" foreign key (goal_id) references public.goals(id) on delete cascade;

alter table "public"."goals"
  add constraint "goals_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."hydration_logs"
  add constraint "hydration_logs_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."insights"
  add constraint "insights_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."meal_plans"
  add constraint "meal_plans_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."profiles"
  add constraint "profiles_id_fkey" foreign key (id) references auth.users(id) on delete cascade;

alter table "public"."recommendations"
  add constraint "recommendations_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

alter table "public"."weight_logs"
  add constraint "weight_logs_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

create index push_subscriptions_created_at_idx on public.push_subscriptions using btree (created_at desc);

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create policy "coach_own" on "public"."coach_messages"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "activity_own" on "public"."daily_activity"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "daily_activity_own" on "public"."daily_activity"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "goal_progress_own" on "public"."goal_progress"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "goals_own" on "public"."goals"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "hydration_own" on "public"."hydration_logs"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "insights_own" on "public"."insights"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "meal_plans_own" on "public"."meal_plans"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "profiles_own" on "public"."profiles"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = id))
  with check ((( SELECT auth.uid() AS uid) = id));

create policy "recommendations_own" on "public"."recommendations"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "weight_own" on "public"."weight_logs"
  for all
  to "authenticated"
  using ((( select auth.uid() as uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

grant execute on function "public"."handle_new_user"() to public, "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."coach_messages" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."daily_activity" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."goal_progress" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."goals" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."hydration_logs" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."insights" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."meal_plans" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."profiles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."push_subscriptions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."recommendations" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."weight_logs" to "anon", "authenticated", "postgres", "service_role";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

