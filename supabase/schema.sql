create table if not exists public.artworks (
  id text primary key,
  title text not null,
  title_zh text,
  category text not null,
  category_zh text,
  period text not null,
  period_zh text,
  image text not null,
  gallery_images jsonb,
  description text not null,
  description_zh text,
  listing_type text not null,
  feature_vector jsonb not null,
  image_signature jsonb,
  case_record jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists artworks_set_updated_at on public.artworks;
create trigger artworks_set_updated_at
before update on public.artworks
for each row execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('artwork-images', 'artwork-images', true)
on conflict (id) do nothing;
