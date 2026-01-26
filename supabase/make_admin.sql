-- Update the user with the specific email to be an admin
UPDATE public.profiles
SET role = 'admin'
FROM auth.users
WHERE profiles.id = auth.users.id
AND auth.users.email = 'asniroz@gmail.com';

-- Verify the change (optional)
-- SELECT p.role, u.email 
-- FROM public.profiles p 
-- JOIN auth.users u ON p.id = u.id 
-- WHERE u.email = 'asniroz@gmail.com';
