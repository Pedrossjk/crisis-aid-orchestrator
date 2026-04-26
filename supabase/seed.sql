-- ============================================================
-- Seed de dados de teste — Crisis Aid Orchestrator
-- Execute no Supabase Dashboard → SQL Editor
-- Pode rodar tudo de uma vez (um único bloco).
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- ETAPA 0 — Corrige trigger handle_new_user e recarrega cache
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- ETAPA 1 — Usuários: 3 ONGs + 8 voluntários
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  _email  text;
  _name   text;
  _uid    uuid;
  _users  text[][] := ARRAY[
    -- ONGs
    ['ong-teste@orquestra.app', 'Cruz Verde Brasil'],
    ['maos@orquestra.app',      'Mãos que Alimentam'],
    ['abrigo@orquestra.app',    'Abrigo Seguro SC'],
    -- Voluntários
    ['marina@orquestra.app',    'Marina Costa'],
    ['rafael@orquestra.app',    'Rafael Souza'],
    ['juliana@orquestra.app',   'Juliana Mendes'],
    ['pedro@orquestra.app',     'Pedro Almeida'],
    ['ana@orquestra.app',       'Ana Lima'],
    ['carlos@orquestra.app',    'Carlos Ramos'],
    ['fernanda@orquestra.app',  'Fernanda Oliveira'],
    ['thiago@orquestra.app',    'Thiago Santos']
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
       confirmation_token, recovery_token, email_change_token_new, email_change,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES
      (_uid, '00000000-0000-0000-0000-000000000000', _email,
       crypt('Teste@1234', gen_salt('bf')), now(),
       '', '', '', '',
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
-- ETAPA 1.5 — Adiciona coordenadas geográficas às ações
-- ═══════════════════════════════════════════════════════════

ALTER TABLE crisis_actions
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- ═══════════════════════════════════════════════════════════
-- ETAPA 2 — Profiles, roles, ONGs, voluntários e ações
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ONGs
  id_ong1      uuid;
  id_ong2      uuid;
  id_ong3      uuid;
  -- Voluntários
  id_marina    uuid;
  id_rafael    uuid;
  id_juliana   uuid;
  id_pedro     uuid;
  id_ana       uuid;
  id_carlos    uuid;
  id_fernanda  uuid;
  id_thiago    uuid;
  -- Linhas de ONG
  id_ngo1      uuid;
  id_ngo2      uuid;
  id_ngo3      uuid;
BEGIN
  SELECT id INTO id_ong1     FROM auth.users WHERE email = 'ong-teste@orquestra.app';
  SELECT id INTO id_ong2     FROM auth.users WHERE email = 'maos@orquestra.app';
  SELECT id INTO id_ong3     FROM auth.users WHERE email = 'abrigo@orquestra.app';
  SELECT id INTO id_marina   FROM auth.users WHERE email = 'marina@orquestra.app';
  SELECT id INTO id_rafael   FROM auth.users WHERE email = 'rafael@orquestra.app';
  SELECT id INTO id_juliana  FROM auth.users WHERE email = 'juliana@orquestra.app';
  SELECT id INTO id_pedro    FROM auth.users WHERE email = 'pedro@orquestra.app';
  SELECT id INTO id_ana      FROM auth.users WHERE email = 'ana@orquestra.app';
  SELECT id INTO id_carlos   FROM auth.users WHERE email = 'carlos@orquestra.app';
  SELECT id INTO id_fernanda FROM auth.users WHERE email = 'fernanda@orquestra.app';
  SELECT id INTO id_thiago   FROM auth.users WHERE email = 'thiago@orquestra.app';

  -- ── Profiles ──
  INSERT INTO profiles (id, full_name, city, state, bio) VALUES
    (id_ong1,    'Cruz Verde Brasil',   'Blumenau',      'SC', 'ONG de resposta a desastres naturais.'),
    (id_ong2,    'Mãos que Alimentam',  'Porto Alegre',  'RS', 'Banco de alimentos e refeições coletivas para comunidades em crise.'),
    (id_ong3,    'Abrigo Seguro SC',    'Chapecó',       'SC', 'Gestão de abrigos emergenciais para famílias desabrigadas.'),
    (id_marina,  'Marina Costa',        'Blumenau',      'SC', 'Cozinheira profissional e logística.'),
    (id_rafael,  'Rafael Souza',        'Itajaí',        'SC', 'Motorista com caminhonete disponível.'),
    (id_juliana, 'Juliana Mendes',      'Florianópolis', 'SC', 'Enfermeira com 10 anos de experiência.'),
    (id_pedro,   'Pedro Almeida',       'Joinville',     'SC', 'Técnico de TI e comunicação.'),
    (id_ana,     'Ana Lima',            'Porto Alegre',  'RS', 'Auxiliar de cozinha e distribuição de alimentos.'),
    (id_carlos,  'Carlos Ramos',        'Porto Alegre',  'RS', 'Almoxarife voluntário e triagem de doações.'),
    (id_fernanda,'Fernanda Oliveira',   'Chapecó',       'SC', 'Psicóloga voluntária e atendimento médico.'),
    (id_thiago,  'Thiago Santos',       'Blumenau',      'SC', 'Motorista de van e apoio logístico.')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name, city = EXCLUDED.city,
    state = EXCLUDED.state, bio = EXCLUDED.bio;

  -- ── Roles ──
  INSERT INTO user_roles (user_id, role) VALUES
    (id_ong1,    'ngo'),
    (id_ong2,    'ngo'),
    (id_ong3,    'ngo'),
    (id_marina,  'volunteer'),
    (id_rafael,  'volunteer'),
    (id_juliana, 'volunteer'),
    (id_pedro,   'volunteer'),
    (id_ana,     'volunteer'),
    (id_carlos,  'volunteer'),
    (id_fernanda,'volunteer'),
    (id_thiago,  'volunteer')
  ON CONFLICT DO NOTHING;

  -- ── ONGs ──
  INSERT INTO ngos (owner_id, name, initials, description, city, state, verified, offers, needs) VALUES
    (id_ong1, 'Cruz Verde Brasil',  'CVB', 'Resposta a crises e desastres naturais.',                    'Blumenau',   'SC', true,
      ARRAY['food','transport','service']::text[],  ARRAY['money','medical','supplies']::text[]),
    (id_ong2, 'Mãos que Alimentam', 'MQA', 'Banco de alimentos e refeições coletivas emergenciais.',    'Porto Alegre','RS', true,
      ARRAY['food','service','supplies']::text[],   ARRAY['money','transport']::text[]),
    (id_ong3, 'Abrigo Seguro SC',   'ASC', 'Gestão de abrigos, distribuição de kits e apoio jurídico.','Chapecó',    'SC', true,
      ARRAY['shelter','service','supplies']::text[], ARRAY['money','medical','food']::text[])
  ON CONFLICT (owner_id) DO NOTHING;

  SELECT id INTO id_ngo1 FROM ngos WHERE owner_id = id_ong1;
  SELECT id INTO id_ngo2 FROM ngos WHERE owner_id = id_ong2;
  SELECT id INTO id_ngo3 FROM ngos WHERE owner_id = id_ong3;

  -- ── Voluntários ──
  INSERT INTO volunteers (id, skills, help_types, resources, availability, reliability, rating, completed_actions, internal_tags) VALUES
    (id_marina,  ARRAY['Cozinhar','Logística'],    ARRAY['food','transport','service']::help_type[],   ARRAY['Caminhão'],               ARRAY['manhã','tarde'],         94, 4.9, 23, ARRAY['Pontual','Líder natural']),
    (id_rafael,  ARRAY['Dirigir','Resgate'],        ARRAY['transport','service']::help_type[],          ARRAY['Carro','Caminhão'],       ARRAY['tarde','noite'],         89, 4.8, 17, ARRAY['Veículo próprio','Experiente']),
    (id_juliana, ARRAY['Saúde','Atendimento'],      ARRAY['medical','service']::help_type[],            ARRAY['Equipamentos médicos'],   ARRAY['manhã','tarde','noite'], 98, 5.0, 41, ARRAY['Certificada','Calma sob pressão']),
    (id_pedro,   ARRAY['TI','Comunicação'],         ARRAY['service']::help_type[],                      ARRAY['Computador'],             ARRAY['manhã'],                 76, 4.7, 12, ARRAY['Bom comunicador']),
    (id_ana,     ARRAY['Cozinhar','Distribuição'],  ARRAY['food','service']::help_type[],               ARRAY['Panelas grandes'],        ARRAY['manhã','tarde'],         85, 4.6, 15, ARRAY['Pontual','Trabalha em equipe']),
    (id_carlos,  ARRAY['Logística','Organização'],  ARRAY['service','supplies']::help_type[],           ARRAY['Prateleiras','Caixas'],   ARRAY['tarde'],                 80, 4.5,  9, ARRAY['Organizado','Preciso']),
    (id_fernanda,ARRAY['Saúde','Psicologia'],       ARRAY['medical','service']::help_type[],            ARRAY['Kit primeiros socorros'], ARRAY['manhã','tarde'],         92, 4.9, 28, ARRAY['Certificada','Empática']),
    (id_thiago,  ARRAY['Dirigir','Montagem'],       ARRAY['transport','service','shelter']::help_type[],ARRAY['Van','Ferramentas'],      ARRAY['manhã','tarde','noite'], 87, 4.7, 20, ARRAY['Polivalente','Disponível'])
  ON CONFLICT (id) DO UPDATE SET
    skills = EXCLUDED.skills, help_types = EXCLUDED.help_types,
    reliability = EXCLUDED.reliability, rating = EXCLUDED.rating,
    completed_actions = EXCLUDED.completed_actions;

  -- ── Ações de crise ──

  -- ONG 1: Cruz Verde Brasil (Blumenau, SC)
  INSERT INTO crisis_actions (ngo_id, title, description, location, latitude, longitude, urgency, effort, help_types, volunteers_needed, volunteers_joined, status) VALUES
    (id_ngo1, 'Distribuição de cestas básicas — Blumenau',
      'Precisamos de voluntários para montagem e entrega de 500 cestas básicas para famílias desabrigadas.',
      'Blumenau, SC',      -26.9196, -49.0661, 'high',   '4h presencial',           ARRAY['food','transport']::help_type[],    20, 8, 'open'),
    (id_ngo1, 'Motoristas para resgate de animais',
      'Buscamos pessoas com carro disponível para resgatar animais ilhados em áreas alagadas.',
      'Itajaí, SC',        -26.9075, -48.6628, 'high',   '6h, requer carro',        ARRAY['transport','service']::help_type[], 8,  3, 'open'),
    (id_ngo1, 'Atendimento médico voluntário',
      'Centro de atendimento precisa de profissionais de saúde para triagem em abrigo.',
      'Florianópolis, SC', -27.5954, -48.5480, 'high',   'Plantão 8h',              ARRAY['medical']::help_type[],             4,  1, 'open'),
    (id_ngo1, 'Suporte de TI para abrigo',
      'Configurar rede Wi-Fi e computadores doados em abrigo temporário.',
      'Joinville, SC',     -26.3039, -48.8456, 'low',    '3h, conhecimento técnico',ARRAY['service']::help_type[],             2,  0, 'open')
  ON CONFLICT DO NOTHING;

  -- ONG 2: Mãos que Alimentam (Porto Alegre, RS)
  INSERT INTO crisis_actions (ngo_id, title, description, location, latitude, longitude, urgency, effort, help_types, volunteers_needed, volunteers_joined, status) VALUES
    (id_ngo2, 'Cozinheiros para refeições coletivas',
      'Precisamos de voluntários para cozinhar 800 refeições diárias para desabrigados.',
      'Porto Alegre, RS',       -30.0346, -51.2177, 'high',   '6h diárias',        ARRAY['food','service']::help_type[],      15, 5, 'open'),
    (id_ngo2, 'Triagem no depósito de doações',
      'Organizar e classificar toneladas de doações recebidas. Requer atenção e organização.',
      'Porto Alegre, RS',       -30.0346, -51.2177, 'medium', '4h, período livre', ARRAY['service','supplies']::help_type[],  10, 4, 'open'),
    (id_ngo2, 'Entrega de marmitas para idosos',
      'Motoristas para entregar refeições a idosos que não conseguem se deslocar.',
      'Grande Porto Alegre, RS',-30.0500, -51.1700, 'medium', '3h matutinas',      ARRAY['food','transport']::help_type[],    8,  2, 'open')
  ON CONFLICT DO NOTHING;

  -- ONG 3: Abrigo Seguro SC (Chapecó, SC)
  INSERT INTO crisis_actions (ngo_id, title, description, location, latitude, longitude, urgency, effort, help_types, volunteers_needed, volunteers_joined, status) VALUES
    (id_ngo3, 'Montagem de barracas emergenciais',
      'Montar 60 barracas em área de abrigo temporário. Requer esforço físico.',
      'Chapecó, SC', -27.1005, -52.6155, 'high',   '8h, trabalho pesado',ARRAY['shelter','service']::help_type[],   12, 3, 'open'),
    (id_ngo3, 'Distribuição de cobertores e roupas',
      'Separar e distribuir kits de roupas e cobertores para 300 famílias no abrigo.',
      'Chapecó, SC', -27.1005, -52.6155, 'high',   '4h, meio turno',     ARRAY['supplies','shelter']::help_type[],  20, 7, 'open'),
    (id_ngo3, 'Apoio psicológico voluntário',
      'Psicólogos voluntários para atendimento emocional de famílias traumatizadas.',
      'Chapecó, SC', -27.1005, -52.6155, 'medium', 'Turnos de 4h',       ARRAY['service','medical']::help_type[],   5,  0, 'open')
  ON CONFLICT DO NOTHING;

END $$;
