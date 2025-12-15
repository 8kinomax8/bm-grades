import { supabase } from './supabaseClient';

// CRUD service for the semester_grades table
// Columns: id, user_id, subject_id, semester_number, grade, created_at
// Unique constraint: (user_id, subject_id, semester_number)

export async function listSemesterGrades() {
  const { data, error } = await supabase
    .from('semester_grades')
    .select(`
      id,
      subject_id,
      semester_number,
      grade,
      created_at,
      subjects (
        name,
        code
      )
    `)
    .order('semester_number', { ascending: true });
  
  if (error) throw error;
  return data ?? [];
}

export async function upsertSemesterGrade({ subject_id, semester_number, grade }) {
  const payload = { subject_id, semester_number, grade };
  
  const { data, error } = await supabase
    .from('semester_grades')
    .upsert(payload, {
      onConflict: 'user_id,subject_id,semester_number',
      ignoreDuplicates: false
    })
    .select(`
      id,
      subject_id,
      semester_number,
      grade,
      subjects (
        name,
        code
      )
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteSemesterGrade(id) {
  const { error } = await supabase
    .from('semester_grades')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}
