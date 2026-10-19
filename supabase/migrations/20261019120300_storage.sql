-- DevisPlus.ma: private file storage.
-- logos:     {organization_id}/document-logo.png, {organization_id}/header-logo.png
-- documents: {organization_id}/{devis|factures}/{year}/{number}.pdf
-- Files are private: the app shows them through signed URLs.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', false), ('documents', 'documents', false)
on conflict (id) do nothing;

-- Organization id from the first folder of a path; null when it is not a uuid.
create function public.storage_org(p_name text)
returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end;
$$;

create policy "members read their files" on storage.objects for select to authenticated
  using (bucket_id in ('logos', 'documents') and public.is_member(public.storage_org(name)));
create policy "members add their files" on storage.objects for insert to authenticated
  with check (bucket_id in ('logos', 'documents') and public.is_member(public.storage_org(name)));
create policy "members replace their files" on storage.objects for update to authenticated
  using (bucket_id in ('logos', 'documents') and public.is_member(public.storage_org(name)))
  with check (bucket_id in ('logos', 'documents') and public.is_member(public.storage_org(name)));
create policy "members remove their logos" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.is_member(public.storage_org(name)));
