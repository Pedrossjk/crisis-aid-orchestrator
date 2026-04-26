-- Ofertas de ajuda entre ONGs (originadas dos matches de recursos)
CREATE TABLE IF NOT EXISTS ngo_help_offers (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- ONG que está oferecendo
  sender_id       uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sender_name     text NOT NULL,
  sender_initials text NOT NULL DEFAULT '?',
  sender_city     text NOT NULL DEFAULT '',
  -- Recurso oferecido
  resource_name   text NOT NULL,
  resource_qty    text NOT NULL DEFAULT '—',
  -- Ação da ONG destinatária
  action_id       text NOT NULL,
  action_title    text NOT NULL,
  -- ONG destinatária (dono da ação)
  recipient_ngo_id uuid REFERENCES auth.users ON DELETE CASCADE,
  -- Mensagem e status
  message         text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  match_score     int  NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE ngo_help_offers ENABLE ROW LEVEL SECURITY;

-- Remetente vê as suas próprias ofertas enviadas
CREATE POLICY "sender_select_own_offers"
  ON ngo_help_offers FOR SELECT
  USING (auth.uid() = sender_id);

-- Destinatário vê as ofertas recebidas
CREATE POLICY "recipient_select_received_offers"
  ON ngo_help_offers FOR SELECT
  USING (auth.uid() = recipient_ngo_id);

-- Qualquer ONG autenticada pode enviar oferta
CREATE POLICY "auth_insert_offers"
  ON ngo_help_offers FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Destinatário pode aceitar/recusar (update status)
CREATE POLICY "recipient_update_offers"
  ON ngo_help_offers FOR UPDATE
  USING (auth.uid() = recipient_ngo_id);
