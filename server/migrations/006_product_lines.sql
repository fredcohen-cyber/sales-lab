-- What each question sells, for the Practice Studio's product filter, and the concept it tests: the
-- versions of one concept test the same skill with different buyers, situations, and levels.
ALTER TABLE drill_versions
  ADD COLUMN product_line text NOT NULL DEFAULT 'general'
    CHECK (product_line IN ('general', 'ravenly', 'omnizant_ai_search', 'omnizant_web')),
  ADD COLUMN concept text NOT NULL DEFAULT '';

UPDATE drill_versions SET product_line = CASE brand WHEN 'ravenly' THEN 'ravenly' WHEN 'omnizant' THEN 'omnizant_web' ELSE 'general' END;

-- A product line belongs to one brand: general questions are for both brands.
ALTER TABLE drill_versions ADD CONSTRAINT drill_versions_product_brand
  CHECK ((product_line = 'general') = (brand = 'both') AND (product_line = 'ravenly') = (brand = 'ravenly'));
