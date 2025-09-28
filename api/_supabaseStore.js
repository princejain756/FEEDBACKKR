const { supabaseAdmin } = require('../lib/supabase');

async function loadSubmissions() {
  try {
    const { data, error } = await supabaseAdmin
      .from('feedback_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading submissions:', error);
      return [];
    }

    // Convert database format back to the format expected by the application
    return data.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      mealPreference: row.meal_preference,
      taste: row.taste,
      service: row.service,
      wait: row.wait_time,
      overall: row.overall,
      favouriteItem: row.favourite_item,
      improvements: row.improvements,
      experienceIndex: row.experience_index,
      sentiment: row.sentiment
    }));
  } catch (error) {
    console.error('Unexpected error loading submissions:', error);
    return [];
  }
}

async function saveSubmissions(subs) {
  try {
    // Clear existing data and insert new data
    const { error: deleteError } = await supabaseAdmin
      .from('feedback_submissions')
      .delete()
      .neq('id', 'nonexistent'); // Delete all rows

    if (deleteError) {
      console.error('Error clearing submissions:', deleteError);
      return false;
    }

    if (!subs || subs.length === 0) {
      return true;
    }

    // Convert application format to database format
    const dbData = subs.map(record => ({
      id: record.id,
      created_at: record.createdAt,
      meal_preference: record.mealPreference,
      taste: record.taste,
      service: record.service,
      wait_time: record.wait,
      overall: record.overall,
      favourite_item: record.favouriteItem,
      improvements: record.improvements,
      experience_index: record.experienceIndex,
      sentiment: record.sentiment
    }));

    const { error: insertError } = await supabaseAdmin
      .from('feedback_submissions')
      .insert(dbData);

    if (insertError) {
      console.error('Error saving submissions:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error saving submissions:', error);
    return false;
  }
}

async function appendSubmission(record) {
  try {
    // Convert application format to database format
    const dbRecord = {
      id: record.id,
      created_at: record.createdAt,
      meal_preference: record.mealPreference,
      taste: record.taste,
      service: record.service,
      wait_time: record.wait,
      overall: record.overall,
      favourite_item: record.favouriteItem,
      improvements: record.improvements,
      experience_index: record.experienceIndex,
      sentiment: record.sentiment
    };

    const { error } = await supabaseAdmin
      .from('feedback_submissions')
      .insert([dbRecord]);

    if (error) {
      console.error('Error appending submission:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error appending submission:', error);
    return false;
  }
}

async function removeSubmission(id) {
  try {
    const { error } = await supabaseAdmin
      .from('feedback_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing submission:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error removing submission:', error);
    return false;
  }
}

async function clearAllSubmissions() {
  try {
    const { error } = await supabaseAdmin
      .from('feedback_submissions')
      .delete()
      .neq('id', 'nonexistent'); // Delete all rows

    if (error) {
      console.error('Error clearing all submissions:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error clearing submissions:', error);
    return false;
  }
}

async function replaceAllSubmissions(subs) {
  // Helper used by import
  await clearAllSubmissions();
  if (!subs || !subs.length) return true;
  return await saveSubmissions(subs);
}

async function currentVersion() {
  try {
    const { data, error } = await supabaseAdmin
      .from('feedback_submissions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting current version:', error);
      return Date.now();
    }

    if (data && data.length > 0) {
      return new Date(data[0].created_at).getTime();
    }

    return Date.now();
  } catch (error) {
    console.error('Unexpected error getting version:', error);
    return Date.now();
  }
}

module.exports = { 
  loadSubmissions, 
  saveSubmissions, 
  appendSubmission, 
  removeSubmission, 
  clearAllSubmissions, 
  replaceAllSubmissions, 
  currentVersion 
};
