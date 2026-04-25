-- Notifications table: voluntário recebe convites e alertas da ONG
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id uuid REFERENCES auth.users ON DELETE CASCADE,   -- voluntário destinatário
  sender_id   uuid REFERENCES auth.users ON DELETE SET NULL,   -- ONG remetente
  sender_name text NOT NULL,
  type        text NOT NULL DEFAULT 'invite',  -- invite | message | system
  title       text NOT NULL,
  body        text NOT NULL,
  unread      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Voluntários veem apenas suas próprias notificações
CREATE POLICY "users_select_own_notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- ONGs autenticadas podem inserir notificações
CREATE POLICY "auth_insert_notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Voluntários podem marcar como lida
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Voluntários podem apagar suas notificações
CREATE POLICY "users_delete_own_notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = recipient_id);
