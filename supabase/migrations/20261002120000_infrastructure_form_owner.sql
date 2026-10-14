-- Infrastructure submissions are written and read through the Next.js server, which
-- authorizes each request with the Better Auth session. The Data API has no access.

-- Nullable because submissions made before sign-in was required have no owner.
alter table public.infrastructure_form
  add column created_by text references public."user" ("id");

create index infrastructure_form_created_by_idx on public.infrastructure_form (created_by);

drop policy "Allow anonymous project submissions" on public.infrastructure_form;
drop policy "Allow anonymous beneficiary submissions" on public."Beneficiaries";
drop policy "Allow anonymous cost submissions" on public.projected_costs;

revoke all on table public.infrastructure_form, public."Beneficiaries", public.projected_costs
  from public, anon, authenticated, service_role;
