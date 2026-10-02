-- =====================================================================
-- Portfolio — sécurisation Supabase
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
--
-- Ce script :
--   1. bascule l'authentification sur Supabase Auth (fini la table `users` maison)
--   2. crée une table `admins` (liste des comptes autorisés à écrire)
--   3. active RLS : lecture publique du contenu, écriture réservée aux admins
--   4. SUPPRIME l'ancienne table `users` (tous les comptes) et les RPC de login maison
--
-- Le script peut être relancé sans risque. Pour déclarer l'admin plus tard :
-- créer le compte dans Authentication > Users > Add user ("Auto confirm"),
-- remplacer l'email ci-dessous, puis relancer le script (ou juste l'insert).
-- =====================================================================

-- 1. Table des administrateurs ----------------------------------------
create table if not exists public.admins (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

drop policy if exists "admins: self read" on public.admins;
create policy "admins: self read" on public.admins
    for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Déclarer l'admin (remplacer l'email)
insert into public.admins (user_id)
select id from auth.users where email = 'REMPLACER_PAR_EMAIL_ADMIN'
on conflict do nothing;

-- 2. RLS sur les tables de contenu ------------------------------------
do $$
declare t text; p record;
begin
    foreach t in array array['publications', 'collaborators', 'teaching', 'outreach'] loop
        execute format('alter table public.%I enable row level security', t);

        -- supprimer toutes les policies existantes (souvent trop permissives)
        for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
            execute format('drop policy %I on public.%I', p.policyname, t);
        end loop;

        execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
        execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
        execute format('create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
        execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);

        execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
    end loop;
end $$;

-- Colonne d'ordre des collaborateurs (utilisée par l'admin)
alter table public.collaborators add column if not exists position integer;

-- Coordonnées optionnelles pour placer précisément un collaborateur sur le globe
alter table public.collaborators add column if not exists lat double precision;
alter table public.collaborators add column if not exists lng double precision;

-- 3. Supprimer l'ancien système d'auth maison ------------------------
-- La table `users` (emails + hash bcrypt) était lisible publiquement.
-- Tous les comptes sont supprimés : la connexion repart de zéro avec Supabase Auth.
drop table if exists public.users cascade;

do $$
declare f record;
begin
    for f in
        select p.oid::regprocedure as sig
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('create_user', 'verify_login')
    loop
        execute format('drop function %s', f.sig);
    end loop;
end $$;
