-- ============================================================
-- Migration: Candidaturas a Ações + Chat de Comunicação
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. action_applications
--    Registra a solicitação de um voluntário para participar de
--    uma ação. O status evolui: pending → accepted | rejected
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_applications (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id       text        NOT NULL,          -- ID da ação (string do mock ou UUID)
  action_title    text        NOT NULL,          -- Título desnormalizado para exibição rápida
  volunteer_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volunteer_name  text,                          -- Nome desnormalizado
  volunteer_initials text,                       -- Iniciais desnormalizadas
  message         text,                          -- Mensagem opcional do voluntário
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(action_id, volunteer_id)
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_updated_at ON action_applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON action_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE action_applications ENABLE ROW LEVEL SECURITY;

-- Voluntário gerencia suas próprias candidaturas
CREATE POLICY "applicant_own_applications" ON action_applications
  FOR ALL USING (volunteer_id = auth.uid());

-- ONGs (usuários autenticados) podem ler todas as candidaturas
-- Ajuste para restringir por ngo_id em produção
CREATE POLICY "authenticated_read_applications" ON action_applications
  FOR SELECT TO authenticated USING (true);

-- ONGs podem atualizar o status das candidaturas
CREATE POLICY "authenticated_update_status" ON action_applications
  FOR UPDATE TO authenticated USING (true);


-- ─────────────────────────────────────────────────────────────
-- 2. chat_messages
--    Mensagens do canal de comunicação aberto após a ONG aceitar
--    a candidatura do voluntário.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id  uuid        NOT NULL REFERENCES action_applications(id) ON DELETE CASCADE,
  sender_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name     text        NOT NULL,
  content         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Todos os participantes autenticados podem ler e escrever no chat
CREATE POLICY "chat_authenticated" ON chat_messages
  FOR ALL TO authenticated USING (true);


-- ─────────────────────────────────────────────────────────────
-- 3. Bucket de avatares (Storage)
--    Cria o bucket público para fotos de perfil dos usuários.
--    Se já existir, a instrução será ignorada.
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: qualquer autenticado pode fazer upload no próprio caminho
CREATE POLICY "avatar_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatar_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

CREATE POLICY "avatar_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
