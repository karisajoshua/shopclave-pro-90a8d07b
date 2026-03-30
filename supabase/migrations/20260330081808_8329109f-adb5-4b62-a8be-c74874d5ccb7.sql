-- Backfill orphaned users: insert profiles for any auth.users missing from profiles
INSERT INTO public.profiles (user_id, full_name)
SELECT au.id, au.raw_user_meta_data->>'full_name'
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.id IS NULL;

-- Backfill customer roles for any auth.users missing from user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'customer'
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.id IS NULL;