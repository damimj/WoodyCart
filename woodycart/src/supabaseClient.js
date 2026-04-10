// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// --- IMPORTANTE ---
// Reemplaza estas claves con tus claves reales de Supabase
const supabaseUrl = 'TU_URL_DE_SUPABASE';
const supabaseKey = 'TU_ANON_KEY';

// Inicializa y exporta el cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

// NOTA: Una vez que pongas tus claves reales, este archivo funcionará como tu única fuente de verdad para la API.
