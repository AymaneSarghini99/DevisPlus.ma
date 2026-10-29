-- DevisPlus.ma: the free trial grows from 2 to 10 quotes, so a company has time to try the app
-- on real work before paying. Used by guard_trial_quotes and read by the app at sign-in.
create or replace function public.trial_quote_limit()
returns int
language sql immutable set search_path = ''
as $$ select 10 $$;
