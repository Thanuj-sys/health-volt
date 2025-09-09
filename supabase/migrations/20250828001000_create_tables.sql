-- Create required tables for medical records
create table public.patient_records (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references auth.users(id) not null,
    uploaded_by uuid references auth.users(id) not null,
    record_type text not null check (record_type in ('Lab Report', 'Imaging', 'Prescription', 'DICOM', 'Note')),
    title text not null,
    notes text,
    storage_path text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.patient_records enable row level security;

-- Policies for patient_records
create policy "Patients can view their own records"
    on patient_records for select
    using (auth.uid() = patient_id);

create policy "Hospitals with access can view patient records"
    on patient_records for select
    using (
        exists (
            select 1 from access_permissions
            where hospital_id = auth.uid()
            and patient_id = patient_records.patient_id
            and granted = true
            and (expires_at is null or expires_at > now())
        )
    );

create policy "Users can upload their own records"
    on patient_records for insert
    with check (auth.uid() = patient_id);

-- Create access_permissions table
create table public.access_permissions (
    id uuid primary key default uuid_generate_v4(),
    patient_id uuid references auth.users(id) not null,
    hospital_id uuid references auth.users(id) not null,
    granted boolean default true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(patient_id, hospital_id)
);

-- Enable RLS
alter table public.access_permissions enable row level security;

-- Policies for access_permissions
create policy "Users can view their own permissions"
    on access_permissions for select
    using (auth.uid() = patient_id or auth.uid() = hospital_id);

create policy "Patients can manage their own permissions"
    on access_permissions for all
    using (auth.uid() = patient_id);

-- Create storage bucket for medical records
insert into storage.buckets (id, name, public) values ('records', 'records', false);

-- Create policy to access storage
create policy "Users can access their own records"
    on storage.objects for select
    using (
        bucket_id = 'records'
        and (
            -- Patient accessing their own records
            (auth.uid() = (storage.foldername(name)::uuid))
            or
            -- Hospital with permission accessing patient records
            exists (
                select 1 from access_permissions
                where hospital_id = auth.uid()
                and patient_id = (storage.foldername(name)::uuid)
                and granted = true
                and (expires_at is null or expires_at > now())
            )
        )
    );
