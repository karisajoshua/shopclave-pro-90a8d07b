
-- Insert Books top-level category
INSERT INTO public.categories (name, slug, image_url) VALUES ('Books', 'books', null);

-- Insert Books subcategories
WITH books AS (SELECT id FROM public.categories WHERE slug = 'books' LIMIT 1)
INSERT INTO public.categories (name, slug, parent_id) VALUES
  ('Fiction', 'fiction', (SELECT id FROM books)),
  ('Non-Fiction', 'non-fiction', (SELECT id FROM books)),
  ('Academic & Textbooks', 'academic-textbooks', (SELECT id FROM books)),
  ('Children''s Books', 'childrens-books', (SELECT id FROM books)),
  ('Comics & Manga', 'comics-manga', (SELECT id FROM books)),
  ('Self-Help & Motivation', 'self-help-motivation', (SELECT id FROM books)),
  ('Religion & Spirituality', 'religion-spirituality', (SELECT id FROM books)),
  ('Business & Finance', 'business-finance-books', (SELECT id FROM books)),
  ('Science & Technology', 'science-technology-books', (SELECT id FROM books)),
  ('Art & Photography', 'art-photography-books', (SELECT id FROM books));
