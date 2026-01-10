-- Update Niroz's profile: Set name and ensure Admin role
-- Profiles table doesn't have email, so we join with auth.users
UPDATE profiles 
SET full_name = 'Niroz', 
    role = 'admin' 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'asniroz@gmail.com'
);
