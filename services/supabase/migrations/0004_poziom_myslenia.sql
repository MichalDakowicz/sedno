-- Poziom myślenia (reasoning_effort) modelu wybranego dla poziomu zadań. null = domyślny poziom modelu.
-- Wartości jak w API OpenAI dla modeli z rozumowaniem.
alter table public.ai_routing
  add column reasoning_effort text check (reasoning_effort in ('none', 'low', 'medium', 'high', 'xhigh'));
