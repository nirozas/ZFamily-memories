-- 1. Ensure the family group exists
DO $$ 
DECLARE
    family_id_val UUID;
    niroz_id UUID;
BEGIN
    -- Create the family group if it doesn't exist
    INSERT INTO family_groups (name)
    VALUES ('Zoabi Family')
    ON CONFLICT DO NOTHING
    RETURNING id INTO family_id_val;

    IF family_id_val IS NULL THEN
        SELECT id INTO family_id_val FROM family_groups WHERE name = 'Zoabi Family' LIMIT 1;
    END IF;

    -- 2. Find Niroz (asniroz@gmail.com) and set as Admin
    SELECT id INTO niroz_id FROM auth.users WHERE email = 'asniroz@gmail.com';
    
    IF niroz_id IS NOT NULL THEN
        UPDATE profiles 
        SET role = 'admin', 
            family_id = family_id_val,
            full_name = 'Niroz'
        WHERE id = niroz_id;
        
        RAISE NOTICE 'Niroz (asniroz@gmail.com) set as administrator.';
    ELSE
        RAISE NOTICE 'User asniroz@gmail.com not found in auth.users.';
    END IF;

    -- 3. Create Invite Code for Rama (Rama.zoabi13@gmail.com)
    -- We use a human-readable but unique code for her
    INSERT INTO invite_codes (code, family_id, created_by, role, max_uses, expires_at)
    VALUES ('WELCOME-RAMA-2026', family_id_val, niroz_id, 'member', 1, NOW() + INTERVAL '30 days')
    ON CONFLICT (code) DO NOTHING;

    RAISE NOTICE 'Invite code WELCOME-RAMA-2026 created for Rama.';
END $$;
