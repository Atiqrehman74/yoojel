-- Adds the prompt to pending_generations so /api/webhooks/muapi can save a
-- finished image or video into the Library itself.
--
-- Until now the Library was only written by the browser, when its polling saw
-- a job complete. Close the app mid-generation and the result was lost from
-- Yoojel even though the provider had produced it -- and the user had already
-- been charged a monthly generation for it.
--
-- Run once in the Supabase SQL Editor.

alter table public.pending_generations
  add column if not exists prompt text;
