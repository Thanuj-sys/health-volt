-- Create profiles table
create table public.profiles (
    id uuid references auth.users primary key,
    role text not null check (role in ('patient', 'hospital')),
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone" 
    on profiles for select 
    using ( true );

create policy "Users can update own profile"
    on profiles for update
    using ( auth.uid() = id );

-- Create policy for inserting profiles (during signup)
create policy "Enable insert for authenticated users only"
    on profiles for insert
    with check ( auth.role() = 'authenticated' );

-- Create function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger handle_updated_at
    before update on public.profiles
    for each row
    execute procedure public.handle_updated_at();
