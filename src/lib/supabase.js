import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to create a feedback submission
export const createFeedbackSubmission = async (feedbackData) => {
  const record = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    meal_preference: feedbackData.mealPreference || null,
    taste: feedbackData.taste,
    service: feedbackData.service,
    wait_time: feedbackData.wait,
    overall: feedbackData.overall,
    favourite_item: (feedbackData.favouriteItem || '').slice(0, 2000),
    improvements: (feedbackData.improvements || '').slice(0, 2000),
  };

  // Calculate experience index
  const avgParts = [record.taste, record.service, record.wait_time, record.overall].filter((v) => typeof v === 'number');
  record.experience_index = avgParts.length ? +(avgParts.reduce((a, b) => a + b, 0) / avgParts.length).toFixed(2) : null;
  
  // Note: sentiment calculation would need to be done on the server-side
  record.sentiment = 0; // Placeholder

  const { data, error } = await supabase
    .from('feedback_submissions')
    .insert([record]);

  if (error) {
    console.error('Error creating feedback submission:', error);
    return { success: false, error };
  }

  return { success: true, data };
};

// Helper function to get all feedback submissions (for admin)
export const getFeedbackSubmissions = async () => {
  const { data, error } = await supabase
    .from('feedback_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feedback submissions:', error);
    return { success: false, error, data: [] };
  }

  // Convert database format back to application format
  const submissions = data.map(row => ({
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

  return { success: true, data: submissions };
};

// Helper function to delete a feedback submission
export const deleteFeedbackSubmission = async (id) => {
  const { error } = await supabase
    .from('feedback_submissions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting feedback submission:', error);
    return { success: false, error };
  }

  return { success: true };
};

// Helper function to clear all feedback submissions
export const clearAllFeedbackSubmissions = async () => {
  const { error } = await supabase
    .from('feedback_submissions')
    .delete()
    .neq('id', 'nonexistent'); // Delete all rows

  if (error) {
    console.error('Error clearing all feedback submissions:', error);
    return { success: false, error };
  }

  return { success: true };
};
