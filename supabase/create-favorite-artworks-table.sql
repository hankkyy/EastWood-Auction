create table if not exists public.favorite_artworks (
  user_id uuid not null references auth.users(id) on delete cascade,
  artwork_id text not null references public.artworks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artwork_id)
);

create index if not exists idx_favorite_artworks_user_created_at
  on public.favorite_artworks(user_id, created_at desc);
