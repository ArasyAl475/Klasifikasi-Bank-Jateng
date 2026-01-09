/*
  # Create classifications cache table
  
  1. New Tables
    - `classification_cache`
      - `id` (uuid, primary key)
      - `input_text` (text, unique - untuk caching)
      - `matched_code` (text - classification code)
      - `confidence` (text - High/Medium/Low)
      - `created_at` (timestamp)
  
  2. Purpose
    - Menyimpan hasil klasifikasi untuk menghindari API calls yang redundan
    - Mempercepat klasifikasi untuk dokumen yang sama atau mirip
    - Mengurangi biaya Gemini API secara signifikan
*/

CREATE TABLE IF NOT EXISTS classification_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_text text UNIQUE NOT NULL,
  matched_code text NOT NULL,
  confidence text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classification_cache_text ON classification_cache (input_text);