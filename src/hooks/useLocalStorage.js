import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'kriedko_feedback_data';
const VERSION_KEY = 'kriedko_feedback_version';

export const useLocalStorage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate unique ID
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }, []);

  // Load feedbacks from localStorage
  const loadFeedbacks = useCallback(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const parsedData = data ? JSON.parse(data) : [];
      setFeedbacks(parsedData);
      setIsLoading(false);
      return parsedData;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      setFeedbacks([]);
      setIsLoading(false);
      return [];
    }
  }, []);

  // Save feedbacks to localStorage
  const saveFeedbacks = useCallback((newFeedbacks) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFeedbacks));
      localStorage.setItem(VERSION_KEY, Date.now().toString());
      setFeedbacks(newFeedbacks);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }, []);

  // Add new feedback
  const addFeedback = useCallback((feedbackData) => {
    const newFeedback = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...feedbackData
    };
    
    const updatedFeedbacks = [newFeedback, ...feedbacks];
    saveFeedbacks(updatedFeedbacks);
    return newFeedback;
  }, [feedbacks, generateId, saveFeedbacks]);

  // Update feedback
  const updateFeedback = useCallback((id, updatedData) => {
    const updatedFeedbacks = feedbacks.map(feedback => 
      feedback.id === id ? { ...feedback, ...updatedData } : feedback
    );
    saveFeedbacks(updatedFeedbacks);
    return updatedFeedbacks.find(feedback => feedback.id === id);
  }, [feedbacks, saveFeedbacks]);

  // Delete feedback
  const deleteFeedback = useCallback((id) => {
    const updatedFeedbacks = feedbacks.filter(feedback => feedback.id !== id);
    saveFeedbacks(updatedFeedbacks);
    return true;
  }, [feedbacks, saveFeedbacks]);

  // Clear all feedbacks
  const clearAllFeedbacks = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
    setFeedbacks([]);
  }, []);

  // Search feedbacks
  const searchFeedbacks = useCallback((query, sentiment = null) => {
    const searchTerm = query.toLowerCase();
    
    return feedbacks.filter(feedback => {
      const textMatch = !query || 
        (feedback.favouriteItem && feedback.favouriteItem.toLowerCase().includes(searchTerm)) ||
        (feedback.improvements && feedback.improvements.toLowerCase().includes(searchTerm)) ||
        (feedback.mealPreference && feedback.mealPreference.toLowerCase().includes(searchTerm));
      
      const sentimentMatch = !sentiment || feedback.sentiment?.label === sentiment;
      
      return textMatch && sentimentMatch;
    });
  }, [feedbacks]);

  // Calculate analytics
  const calculateAnalytics = useCallback(() => {
    if (feedbacks.length === 0) {
      return {
        count: 0,
        averages: {},
        sentiment: { positive: 0, neutral: 0, negative: 0, averageScore: 0 }
      };
    }

    const numericFields = ['taste', 'service', 'wait', 'overall', 'experienceIndex'];
    const averages = {};
    
    numericFields.forEach(field => {
      const values = feedbacks
        .map(f => f[field])
        .filter(v => v !== null && v !== undefined && !isNaN(v));
      
      if (values.length > 0) {
        averages[field] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    let sentimentSum = 0;
    let sentimentCount = 0;

    feedbacks.forEach(feedback => {
      if (feedback.sentiment?.label) {
        sentimentCounts[feedback.sentiment.label]++;
        if (feedback.sentiment.score !== undefined) {
          sentimentSum += feedback.sentiment.score;
          sentimentCount++;
        }
      }
    });

    return {
      count: feedbacks.length,
      averages,
      sentiment: {
        ...sentimentCounts,
        averageScore: sentimentCount > 0 ? sentimentSum / sentimentCount : 0
      }
    };
  }, [feedbacks]);

  // Export data
  const exportData = useCallback(() => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      feedbacks: feedbacks
    };
    return JSON.stringify(exportData, null, 2);
  }, [feedbacks]);

  // Import data
  const importData = useCallback((jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.feedbacks && Array.isArray(data.feedbacks)) {
        saveFeedbacks(data.feedbacks);
        return { success: true, count: data.feedbacks.length };
      }
      return { success: false, error: 'Invalid data format' };
    } catch (error) {
      return { success: false, error: 'Invalid JSON format' };
    }
  }, [saveFeedbacks]);

  // Load feedbacks on mount
  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  return {
    feedbacks,
    isLoading,
    addFeedback,
    updateFeedback,
    deleteFeedback,
    clearAllFeedbacks,
    searchFeedbacks,
    calculateAnalytics,
    exportData,
    importData,
    loadFeedbacks
  };
};
