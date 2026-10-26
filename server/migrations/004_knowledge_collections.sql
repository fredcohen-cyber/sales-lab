-- Knowledge collections: the Sales Playbook and each brand's product knowledge. A collection is made of
-- sections, and each section is a knowledge source of its own: edited, versioned, and approved one at a
-- time, so changing one section never touches another. Drills point at the sections they need.

CREATE TABLE knowledge_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE,
  name        text NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('playbook', 'product')),
  brand       text NOT NULL CHECK (brand IN ('omnizant', 'ravenly', 'both')),
  description text NOT NULL DEFAULT '',
  position    int NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Where a section sits is structure, not content: moving or regrouping it needs no new version or approval.
ALTER TABLE knowledge_sources
  ADD COLUMN collection_id uuid REFERENCES knowledge_collections(id),
  ADD COLUMN position int NOT NULL DEFAULT 0,
  ADD COLUMN group_label text NOT NULL DEFAULT '',
  -- A long document that was split into sections points at the collection that now holds them.
  ADD COLUMN split_into_collection_id uuid REFERENCES knowledge_collections(id);

CREATE INDEX knowledge_sources_collection ON knowledge_sources (collection_id, position);
