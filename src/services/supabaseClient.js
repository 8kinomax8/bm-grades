import { createClient } from '@supabase/supabase-js';

// Chargement des variables d'environnement (exposées par Vite en prefixant VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Vérifications basiques pour éviter un silence en production si variables manquantes
if (!supabaseUrl || !supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] URL ou clé publique manquante. Vérifie .env.local ou variables Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
