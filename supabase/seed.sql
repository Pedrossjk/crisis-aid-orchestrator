-- ============================================================
-- Seed de dados de teste — Crisis Aid Orchestrator
-- Execute no Supabase Dashboard → SQL Editor
-- Pode rodar tudo de uma vez (um único bloco).
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- ETAPA 1 — Crie os usuários
-- Usa INSERT direto (auth.create_user não existe nesta versão)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  _email  text;
  _name   text;
  _uid    uuid;
  _users  text[][] := ARRAY[
    ['ong-teste@orquestra.app', 'Cruz Verde Brasil'],
    ['marina@orquestra.app',    'Marina Costa'],
    ['rafael@orquestra.app',    'Rafael Souza'],
    ['juliana@orquestra.app',   'Juliana Mendes'],
    ['pedro@orquestra.app',     'Pedro Almeida']
  ];
  _pair   text[];
BEGIN
  FOREACH _pair SLICE 1 IN ARRAY _users LOOP
    _email := _pair[1];
    _name  := _pair[2];

    -- Pula se o usuário já existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
      CONTINUE;
    END IF;

    _uid := gen_random_uuid();

    INSERT INTO auth.users
      (id, instance_id, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES
      (_uid, '00000000-0000-0000-0000-000000000000', _email,
       crypt('Teste@1234', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}',
       jsonb_build_object('full_name', _name),
       now(), now(), 'authenticated', 'authenticated');

    INSERT INTO auth.identities
      (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES
      (gen_random_uuid(), _uid, _email,
       jsonb_build_object('sub', _uid::text, 'email', _email),
       'email', now(), now(), now());
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════
-- ETAPA 2 — Profiles, roles, ONG, voluntários e ações
-- Rode este bloco APÓS a etapa 1
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  id_ong       uuid;
  id_marina    uuid;
  id_rafael    uuid;
  id_juliana   uuid;
  id_pedro     uuid;
  id_ngo_row   uuid;
BEGIN
  SELECT id INTO id_ong     FROM auth.users WHERE email = 'ong-teste@orquestra.app';
  SELECT id INTO id_marina  FROM auth.users WHERE email = 'marina@orquestra.app';
  SELECT id INTO id_rafael  FROM auth.users WHERE email = 'rafael@orquestra.app';
  SELECT id INTO id_juliana FROM auth.users WHERE email = 'juliana@orquestra.app';
  SELECT id INTO id_pedro   FROM auth.users WHERE email = 'pedro@orquestra.app';

  -- Profiles
  INSERT INTO profiles (id, full_name, city, state, bio) VALUES
    (id_ong,     'Cruz Verde Brasil',  'Blumenau',      'SC', 'ONG de resposta a desastres naturais.'),
    (id_marina,  'Marina Costa',       'Blumenau',      'SC', 'Cozinheira profissional e logística.'),
    (id_rafael,  'Rafael Souza',       'Itajaí',        'SC', 'Motorista com caminhonete disponível.'),
    (id_juliana, 'Juliana Mendes',     'Florianópolis', 'SC', 'Enfermeira com 10 anos de experiência.'),
    (id_pedro,   'Pedro Almeida',      'Joinville',     'SC', 'Técnico de TI e comunicação.')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name, city = EXCLUDED.city,
    state = EXCLUDED.state, bio = EXCLUDED.bio;

  -- Roles
  INSERT INTO user_roles (user_id, role) VALUES
    (id_ong,     'ngo'),
    (id_marina,  'volunteer'),
    (id_rafael,  'volunteer'),
    (id_juliana, 'volunteer'),
    (id_pedro,   'volunteer')
  ON CONFLICT DO NOTHING;

  -- ONG
  INSERT INTO ngos (owner_id, name, initials, description, city, state, verified, offers, needs) VALUES (
    id_ong, 'Cruz Verde Brasil', 'CVB', 'Organização de resposta a crises e desastres naturais.',
    'Blumenau', 'SC', true,
    ARRAY['food','transport','service']::text[],
    ARRAY['money','medical','supplies']::text[]
  ) ON CONFLICT (owner_id) DO NOTHING;

  SELECT id INTO id_ngo_row FROM ngos WHERE owner_id = id_ong;

  -- Voluntários
  INSERT INTO volunteers (id, skills, help_types, resources, availability, reliability, rating, completed_actions, internal_tags) VALUES
    (id_marina,  ARRAY['Cozinhar','Logística'],  ARRAY['food','transport','service']::help_type[], ARRAY['Caminhão'],             ARRAY['manhã','tarde'],        94, 4.9, 23, ARRAY['Pontual','Líder natural']),
    (id_rafael,  ARRAY['Dirigir','Resgate'],      ARRAY['transport','service']::help_type[],        ARRAY['Carro','Caminhão'],     ARRAY['tarde','noite'],        89, 4.8, 17, ARRAY['Veículo próprio','Experiente']),
    (id_juliana, ARRAY['Saúde','Atendimento'],    ARRAY['medical','service']::help_type[],          ARRAY['Equipamentos médicos'], ARRAY['manhã','tarde','noite'],98, 5.0, 41, ARRAY['Profissional certificada','Calma sob pressão']),
    (id_pedro,   ARRAY['TI','Comunicação'],       ARRAY['service']::help_type[],                    ARRAY['Computador'],           ARRAY['manhã'],                76, 4.7, 12, ARRAY['Bom comunicador'])
  ON CONFLICT (id) DO UPDATE SET
    skills = EXCLUDED.skills, help_types = EXCLUDED.help_types,
    reliability = EXCLUDED.reliability, rating = EXCLUDED.rating,
    completed_actions = EXCLUDED.completed_actions;

  -- Ações de crise
  INSERT INTO crisis_actions (ngo_id, title, description, location, urgency, effort, help_types, volunteers_needed, volunteers_joined, status) VALUES
    (id_ngo_row, 'Distribuição de cestas básicas — Blumenau', 'Precisamos de voluntários para montagem e entrega de 500 cestas básicas para famílias desabrigadas.', 'Blumenau, SC',      'high', '4h presencial',           ARRAY['food','transport']::help_type[],    20, 8, 'open'),
    (id_ngo_row, 'Motoristas para resgate de animais',        'Buscamos pessoas com carro disponível para resgatar animais ilhados em áreas alagadas.',             'Itajaí, SC',        'high', '6h, requer carro',        ARRAY['transport','service']::help_type[], 8,  3, 'open'),
    (id_ngo_row, 'Atendimento médico voluntário',             'Centro de atendimento precisa de profissionais de saúde para triagem em abrigo.',                    'Florianópolis, SC', 'high', 'Plantão 8h',              ARRAY['medical']::help_type[],             4,  1, 'open'),
    (id_ngo_row, 'Suporte de TI para abrigo',                'Configurar rede Wi-Fi e computadores doados em abrigo temporário.',                                  'Joinville, SC',     'low',  '3h, conhecimento técnico', ARRAY['service']::help_type[],             2,  0, 'open')
  ON CONFLICT DO NOTHING;

END $$;
