import { supabase } from './supabaseClient';

// Service CRUD pour la table subjects

export async function listSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, code, created_at')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateSubject(name, code = null) {
  // Chercher si la matière existe déjà pour cet utilisateur
  const { data: existing, error: searchError } = await supabase
    .from('subjects')
    .select('id, name, code')
    .eq('name', name)
    .maybeSingle();
  
  if (searchError) throw searchError;
  
  // Si elle existe, la retourner
  if (existing) {
    return existing;
  }
  
  // Sinon, la créer
  const { data: newSubject, error: insertError } = await supabase
    .from('subjects')
    .insert([{ name, code }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  return newSubject;
}

export async function deleteSubject(id) {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
