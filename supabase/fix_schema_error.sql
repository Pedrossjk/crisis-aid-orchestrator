-- ============================================================
-- SEED DE DEMO — candidaturas e mensagens de chat
-- Execute APÓS o seed.sql principal
-- Cria candidaturas aceitas para mostrar o chat entre contas
-- ============================================================

DO $$
DECLARE
  id_marina    uuid;
  id_juliana   uuid;
  id_rafael    uuid;
  id_ong1      uuid;
  id_action1   uuid;
  id_action3   uuid;
  id_app1      uuid;
  id_app2      uuid;
BEGIN
  SELECT id INTO id_marina   FROM auth.users WHERE email = 'marina@orquestra.app';
  SELECT id INTO id_juliana  FROM auth.users WHERE email = 'juliana@orquestra.app';
  SELECT id INTO id_rafael   FROM auth.users WHERE email = 'rafael@orquestra.app';
  SELECT id INTO id_ong1     FROM auth.users WHERE email = 'ong-teste@orquestra.app';

  -- Pega a 1ª e 3ª ação da Cruz Verde Brasil
  SELECT id INTO id_action1
    FROM crisis_actions
    WHERE title LIKE '%cestas básicas%'
    LIMIT 1;

  SELECT id INTO id_action3
    FROM crisis_actions
    WHERE title LIKE '%médico%'
    LIMIT 1;

  -- Candidatura 1: Marina → Cestas básicas (já aceita)
  INSERT INTO action_applications
    (action_id, action_title, volunteer_id, volunteer_name, volunteer_initials, message, status)
  VALUES
    (id_action1::text, 'Distribuição de cestas básicas — Blumenau',
     id_marina, 'Marina Costa', 'MC',
     'Tenho experiência com logística e cozinha. Posso ajudar tanto na montagem quanto na entrega!',
     'accepted')
  ON CONFLICT (action_id, volunteer_id) DO NOTHING
  RETURNING id INTO id_app1;

  -- Candidatura 2: Juliana → Atendimento médico (já aceita)
  INSERT INTO action_applications
    (action_id, action_title, volunteer_id, volunteer_name, volunteer_initials, message, status)
  VALUES
    (id_action3::text, 'Atendimento médico voluntário',
     id_juliana, 'Juliana Mendes', 'JM',
     'Sou enfermeira com 10 anos de experiência. Disponível para plantão completo.',
     'accepted')
  ON CONFLICT (action_id, volunteer_id) DO NOTHING
  RETURNING id INTO id_app2;

  -- Candidatura 3: Rafael → Cestas básicas (pendente, para demo de aceitar ao vivo)
  INSERT INTO action_applications
    (action_id, action_title, volunteer_id, volunteer_name, volunteer_initials, message, status)
  VALUES
    (id_action1::text, 'Distribuição de cestas básicas — Blumenau',
     id_rafael, 'Rafael Souza', 'RS',
     'Tenho caminhonete disponível e posso ajudar nas entregas.',
     'pending')
  ON CONFLICT (action_id, volunteer_id) DO NOTHING;

  -- Mensagens de chat pré-existentes (só se as candidaturas foram criadas agora)
  IF id_app1 IS NOT NULL THEN
    INSERT INTO chat_messages (application_id, sender_id, sender_name, content) VALUES
      (id_app1, id_ong1,   'Cruz Verde Brasil', 'Olá Marina! Bem-vinda à equipe. Podemos contar com você amanhã às 8h?'),
      (id_app1, id_marina, 'Marina Costa',      'Claro! Estarei lá às 8h em ponto. Preciso levar algum equipamento específico?'),
      (id_app1, id_ong1,   'Cruz Verde Brasil', 'Pode trazer luvas de borracha se tiver. O restante fornecemos aqui. Obrigado!');
  END IF;

  IF id_app2 IS NOT NULL THEN
    INSERT INTO chat_messages (application_id, sender_id, sender_name, content) VALUES
      (id_app2, id_ong1,    'Cruz Verde Brasil', 'Juliana, sua candidatura foi aceita! Precisamos de você no abrigo central. Você pode começar hoje às 14h?'),
      (id_app2, id_juliana, 'Juliana Mendes',    'Perfeito! Estarei lá. Devo levar meu estetoscópio e outros equipamentos?'),
      (id_app2, id_ong1,    'Cruz Verde Brasil',  'Sim, traga o que puder. Temos medicamentos básicos aqui mas precisamos de mais profissionais. Até às 14h!');
  END IF;

END $$;

