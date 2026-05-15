
-- Generations table
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_url TEXT,
  brief TEXT,
  cta_text TEXT,
  audience TEXT,
  tone TEXT,
  language TEXT,
  template TEXT,
  scene_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  script_text TEXT,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  view_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generations_slug ON public.generations(slug);
CREATE INDEX idx_generations_created_at ON public.generations(created_at DESC);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Generations are publicly readable"
  ON public.generations FOR SELECT USING (true);

CREATE POLICY "Anyone can create generations"
  ON public.generations FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update generations"
  ON public.generations FOR UPDATE USING (true);

-- Settings (singleton row keyed by id='global')
CREATE TABLE public.settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
  heygen_key_last4 TEXT,
  heygen_key_configured BOOLEAN NOT NULL DEFAULT false,
  mock_mode BOOLEAN NOT NULL DEFAULT true,
  default_tone TEXT NOT NULL DEFAULT 'Confident',
  default_language TEXT NOT NULL DEFAULT 'English',
  default_template TEXT NOT NULL DEFAULT 'Product Launch',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by anyone"
  ON public.settings FOR SELECT USING (true);

CREATE POLICY "Anyone can upsert settings"
  ON public.settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update settings"
  ON public.settings FOR UPDATE USING (true);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_generations_updated_at
  BEFORE UPDATE ON public.generations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed singleton settings row
INSERT INTO public.settings (id) VALUES ('global') ON CONFLICT DO NOTHING;

-- Seed history with 5 demo generations
INSERT INTO public.generations (slug, product_name, product_url, brief, cta_text, audience, tone, language, template, status, scene_plan, script_text, video_url, view_count, duration_seconds, created_at) VALUES
('acme-x42z', 'Acme API', 'https://acme-api.dev', 'Acme API lets developers integrate payments in under 10 minutes with one SDK, zero backend configuration, and enterprise-grade reliability.', 'Start building free', 'Backend developers and technical founders', 'Confident', 'English', 'Product Launch', 'success',
  '[{"number":"01","title":"The Problem","duration":"~18s","description":"Payment integration eats weeks of engineering time."},{"number":"02","title":"The Solution","duration":"~24s","description":"One SDK, ten minutes, forty gateways out of the box."},{"number":"03","title":"The Close","duration":"~12s","description":"Ship payments today, sleep tonight."}]'::jsonb,
  'Scene 1: Every payment integration starts the same way — weeks of docs, edge cases, and webhook plumbing.\n\nScene 2: Acme API collapses that into ten minutes. One SDK, forty gateways, sub-100ms latency, and a 99.99% uptime SLA backed by real engineers.\n\nScene 3: Stop reinventing checkout. Start building free at acme-api.dev.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 17, 54, now() - interval '2 hours'),
('prsm-9k2x', 'Prisma ORM', 'https://prisma.io', 'Type-safe database access for Node.js and TypeScript. Auto-generated query builder that catches errors at compile time.', 'Try Prisma', 'TypeScript developers', 'Technical', 'English', 'API Demo', 'success',
  '[{"number":"01","title":"The Problem","duration":"~16s","description":"Raw SQL drops type safety the moment data leaves the database."},{"number":"02","title":"The Solution","duration":"~26s","description":"A schema-first ORM that generates a fully typed client."},{"number":"03","title":"The Close","duration":"~12s","description":"Ship faster with confidence."}]'::jsonb,
  'Scene 1: Your TypeScript is type-safe. Your database calls are not.\n\nScene 2: Prisma generates a query builder from your schema, so every column, relation, and migration is checked at compile time.\n\nScene 3: Try Prisma and stop losing types at the database boundary.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 84, 54, now() - interval '1 day'),
('linr-3jjm', 'Linear', 'https://linear.app', 'The issue tracker built for high-velocity software teams. Keyboard-first, opinionated, fast.', 'Start free trial', 'Product and engineering teams', 'Confident', 'English', 'Feature Update', 'stopped',
  '[{"number":"01","title":"The Problem","duration":"~15s","description":"Issue trackers slow teams down instead of speeding them up."}]'::jsonb,
  null,
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 0, null, now() - interval '3 days'),
('rsnd-7m4q', 'Resend', 'https://resend.com', 'The email API for developers. Sub-second delivery, React-based templates, and a deliverability team that actually answers.', 'Send your first email', 'Developers shipping transactional email', 'Friendly', 'English', 'API Demo', 'success',
  '[{"number":"01","title":"The Problem","duration":"~17s","description":"Transactional email is a black box until it breaks in production."},{"number":"02","title":"The Solution","duration":"~25s","description":"A modern email API with React templates and real deliverability data."},{"number":"03","title":"The Close","duration":"~12s","description":"Send your first email in two lines of code."}]'::jsonb,
  'Scene 1: You wrote the email. You sent the email. It landed in spam. Welcome to transactional email in 2024.\n\nScene 2: Resend gives you a clean API, React-based templates, and a deliverability team that picks up the phone.\n\nScene 3: Send your first email in two lines of code at resend.com.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 132, 54, now() - interval '5 days'),
('vrcl-2zna', 'Vercel', 'https://vercel.com', 'The frontend cloud. Build, preview, and ship from any framework with zero configuration.', 'Deploy your project', 'Frontend developers', 'Confident', 'English', 'Product Launch', 'failed',
  '[]'::jsonb,
  null,
  null, 0, null, now() - interval '7 days');
