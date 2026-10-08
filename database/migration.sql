-- AUREX AI pin migration
-- PostgreSQL / Render
ALTER TABLE aurex_conversations
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ix_aurex_conversations_pinned
ON aurex_conversations (user_id, is_pinned, updated_at DESC);

-- SQLite local development:
-- ALTER TABLE aurex_conversations ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0;
