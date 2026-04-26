-- Tabela de recursos oferecidos pelas ONGs
CREATE TABLE IF NOT EXISTS ngo_resources (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  org_name    text NOT NULL,
  resource    text NOT NULL,
  category    text NOT NULL DEFAULT 'service',
  quantity    text NOT NULL DEFAULT '—',
  location    text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE ngo_resources ENABLE ROW LEVEL SECURITY;

-- Recria as políticas (DROP IF EXISTS para ser idempotente)
DROP POLICY IF EXISTS "auth_select_ngo_resources"  ON ngo_resources;
DROP POLICY IF EXISTS "owner_insert_ngo_resources" ON ngo_resources;
DROP POLICY IF EXISTS "owner_update_ngo_resources" ON ngo_resources;
DROP POLICY IF EXISTS "owner_delete_ngo_resources" ON ngo_resources;

-- Qualquer usuário autenticado pode ver todos os recursos (para matching entre ONGs)
CREATE POLICY "auth_select_ngo_resources"
  ON ngo_resources FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Apenas o dono pode inserir
CREATE POLICY "owner_insert_ngo_resources"
  ON ngo_resources FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Apenas o dono pode atualizar
CREATE POLICY "owner_update_ngo_resources"
  ON ngo_resources FOR UPDATE
  USING (auth.uid() = owner_id);

-- Apenas o dono pode excluir
CREATE POLICY "owner_delete_ngo_resources"
  ON ngo_resources FOR DELETE
  USING (auth.uid() = owner_id);

-- ════════════════════════════════════════════════════════════
-- Seed: recursos iniciais vinculados às ONGs do seed.sql
-- (Execute após o seed.sql principal)
-- ════════════════════════════════════════════════════════════
DO $$
DECLARE
  id_ong1 uuid;
  id_ong2 uuid;
  id_ong3 uuid;
BEGIN
  SELECT id INTO id_ong1 FROM auth.users WHERE email = 'ong-teste@orquestra.app';
  SELECT id INTO id_ong2 FROM auth.users WHERE email = 'maos@orquestra.app';
  SELECT id INTO id_ong3 FROM auth.users WHERE email = 'abrigo@orquestra.app';

  IF id_ong1 IS NULL OR id_ong2 IS NULL OR id_ong3 IS NULL THEN
    RAISE NOTICE 'Usuários ONG não encontrados — execute o seed.sql primeiro.';
    RETURN;
  END IF;

  INSERT INTO ngo_resources (owner_id, org_name, resource, category, quantity, location) VALUES
    -- Cruz Verde Brasil → match com ações de food/transport em Blumenau e Itajaí
    (id_ong1, 'Cruz Verde Brasil',
      '500 cestas básicas prontas para distribuição com arroz, feijão, óleo e macarrão para famílias desabrigadas',
      'food', '500 kits', 'Blumenau, SC'),
    (id_ong1, 'Cruz Verde Brasil',
      'Caminhão baú refrigerado para transporte de alimentos e resgate em áreas alagadas — disponível imediatamente',
      'transport', '1 veículo', 'Blumenau, SC'),
    (id_ong1, 'Cruz Verde Brasil',
      'Kit de primeiros socorros completo com curativos, antisséptico, maca e desfibrilador para atendimento médico emergencial em abrigos',
      'medical', '20 kits', 'Blumenau, SC'),

    -- Mãos que Alimentam → match com ações de food/supplies em Porto Alegre
    (id_ong2, 'Mãos que Alimentam',
      '800 marmitas por dia — refeições quentes preparadas em cozinha industrial certificada para cozinheiros e distribuição de alimentos em abrigos',
      'food', '800 refeições/dia', 'Porto Alegre, RS'),
    (id_ong2, 'Mãos que Alimentam',
      'Galpão logístico de 400 m² para triagem e organização de doações — inclui prateleiras e caixas identificadas',
      'supplies', '400 m²', 'Porto Alegre, RS'),
    (id_ong2, 'Mãos que Alimentam',
      'Van disponível para entrega de marmitas e refeições para idosos e famílias que não conseguem se deslocar',
      'transport', '1 van', 'Porto Alegre, RS'),

    -- Abrigo Seguro SC → match com ações de shelter/supplies em Chapecó
    (id_ong3, 'Abrigo Seguro SC',
      'Tendas militares impermeáveis para montagem de abrigo emergencial — comportam até 8 pessoas cada com colchonetes',
      'shelter', '15 tendas', 'Chapecó, SC'),
    (id_ong3, 'Abrigo Seguro SC',
      '600 cobertores térmicos e kits de roupas infantis e adultos para distribuição imediata em abrigos',
      'supplies', '600 itens', 'Chapecó, SC'),
    (id_ong3, 'Abrigo Seguro SC',
      'Psicólogos voluntários para apoio psicológico e atendimento emocional de famílias traumatizadas em abrigos',
      'service', '3 profissionais', 'Chapecó, SC')
  ON CONFLICT DO NOTHING;
END $$;
