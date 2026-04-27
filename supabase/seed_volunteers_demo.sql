-- ============================================================
-- Seed de voluntários para demo — Crisis Aid Orchestrator
-- Execute no Supabase Dashboard → SQL Editor
-- Cria 4 voluntários com help_types compatíveis com as ações
-- críticas do banco (medical, food, transport, shelter).
--
-- Login de todos: senha = Demo@1234
-- ============================================================

DO $$
DECLARE
  _uid_juliana  uuid;
  _uid_marina   uuid;
  _uid_thiago   uuid;
  _uid_ana      uuid;
  _email        text;
  _uid          uuid;
  _users        text[][] := ARRAY[
    ['juliana.demo@orquestra.app', 'Juliana Mendes'],
    ['marina.demo@orquestra.app',  'Marina Costa'],
    ['thiago.demo@orquestra.app',  'Thiago Santos'],
    ['ana.demo@orquestra.app',     'Ana Lima']
  ];
  _pair         text[];
BEGIN
  -- Cria usuários no auth.users (pula se já existir)
  FOREACH _pair SLICE 1 IN ARRAY _users LOOP
    _email := _pair[1];

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
      _uid := gen_random_uuid();

      INSERT INTO auth.users
        (id, instance_id, email, encrypted_password, email_confirmed_at,
         confirmation_token, recovery_token, email_change_token_new, email_change,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
      VALUES
        (_uid, '00000000-0000-0000-0000-000000000000', _email,
         crypt('Demo@1234', gen_salt('bf')), now(),
         '', '', '', '',
         '{"provider":"email","providers":["email"]}',
         jsonb_build_object('full_name', _pair[2]),
         now(), now(), 'authenticated', 'authenticated');

      INSERT INTO auth.identities
        (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES
        (gen_random_uuid(), _uid, _email,
         jsonb_build_object('sub', _uid::text, 'email', _email),
         'email', now(), now(), now());
    END IF;
  END LOOP;

  -- Busca os UUIDs criados
  SELECT id INTO _uid_juliana FROM auth.users WHERE email = 'juliana.demo@orquestra.app';
  SELECT id INTO _uid_marina  FROM auth.users WHERE email = 'marina.demo@orquestra.app';
  SELECT id INTO _uid_thiago  FROM auth.users WHERE email = 'thiago.demo@orquestra.app';
  SELECT id INTO _uid_ana     FROM auth.users WHERE email = 'ana.demo@orquestra.app';

  -- Profiles
  INSERT INTO profiles (id, full_name, city, state, bio) VALUES
    (_uid_juliana, 'Juliana Mendes',  'Florianópolis', 'SC', 'Enfermeira com 10 anos de experiência em emergências.'),
    (_uid_marina,  'Marina Costa',    'Blumenau',      'SC', 'Cozinheira profissional e logística humanitária.'),
    (_uid_thiago,  'Thiago Santos',   'Blumenau',      'SC', 'Motorista de van e apoio logístico em resgates.'),
    (_uid_ana,     'Ana Lima',        'Porto Alegre',  'RS', 'Auxiliar de cozinha e distribuição de alimentos.')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name, city = EXCLUDED.city,
    state = EXCLUDED.state, bio = EXCLUDED.bio;

  -- Roles
  INSERT INTO user_roles (user_id, role) VALUES
    (_uid_juliana, 'volunteer'),
    (_uid_marina,  'volunteer'),
    (_uid_thiago,  'volunteer'),
    (_uid_ana,     'volunteer')
  ON CONFLICT DO NOTHING;

  -- Voluntários com help_types compatíveis com ações críticas
  INSERT INTO volunteers (id, skills, help_types, resources, availability, reliability, rating, completed_actions) VALUES
    (_uid_juliana,
      ARRAY['Saúde','Atendimento médico','Primeiros socorros'],
      ARRAY['medical','service']::help_type[],
      ARRAY['Equipamentos médicos','Kit primeiros socorros'],
      ARRAY['manhã','tarde','noite'],
      98, 5.0, 41),

    (_uid_marina,
      ARRAY['Cozinhar','Logística','Distribuição'],
      ARRAY['food','transport','service']::help_type[],
      ARRAY['Caminhão','Panelas industriais'],
      ARRAY['manhã','tarde'],
      94, 4.9, 23),

    (_uid_thiago,
      ARRAY['Dirigir','Resgate','Montagem'],
      ARRAY['transport','shelter','service']::help_type[],
      ARRAY['Van','Ferramentas'],
      ARRAY['manhã','tarde','noite'],
      87, 4.7, 20),

    (_uid_ana,
      ARRAY['Cozinhar','Distribuição de alimentos'],
      ARRAY['food','service']::help_type[],
      ARRAY['Panelas grandes'],
      ARRAY['manhã','tarde'],
      85, 4.6, 15)
  ON CONFLICT (id) DO UPDATE SET
    skills       = EXCLUDED.skills,
    help_types   = EXCLUDED.help_types,
    reliability  = EXCLUDED.reliability,
    rating       = EXCLUDED.rating,
    completed_actions = EXCLUDED.completed_actions;

  RAISE NOTICE '✅ Voluntários criados com sucesso!';
  RAISE NOTICE 'juliana.demo@orquestra.app → medical/service  (score esperado: ~85)';
  RAISE NOTICE 'marina.demo@orquestra.app  → food/transport   (score esperado: ~80)';
  RAISE NOTICE 'thiago.demo@orquestra.app  → transport/shelter (score esperado: ~75)';
  RAISE NOTICE 'ana.demo@orquestra.app     → food/service     (score esperado: ~70)';
  RAISE NOTICE 'Senha de todos: Demo@1234';
END $$;
