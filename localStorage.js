// Local Storage utility for feedback data
class FeedbackStorage {
  constructor() {
    this.storageKey = 'kriedko_feedback_data';
    this.versionKey = 'kriedko_feedback_version';
  }

  // Generate unique ID for feedback entries
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get all feedbacks from local storage
  getAllFeedbacks() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  // Save all feedbacks to local storage
  saveAllFeedbacks(feedbacks) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(feedbacks));
      localStorage.setItem(this.versionKey, Date.now().toString());
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  // Add a new feedback
  addFeedback(feedbackData) {
    const feedbacks = this.getAllFeedbacks();
    const newFeedback = {
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      ...feedbackData
    };
    
    feedbacks.unshift(newFeedback); // Add to beginning for latest first
    this.saveAllFeedbacks(feedbacks);
    return newFeedback;
  }

  // Get feedback by ID
  getFeedbackById(id) {
    const feedbacks = this.getAllFeedbacks();
    return feedbacks.find(feedback => feedback.id === id);
  }

  // Update feedback by ID
  updateFeedback(id, updatedData) {
    const feedbacks = this.getAllFeedbacks();
    const index = feedbacks.findIndex(feedback => feedback.id === id);
    
    if (index !== -1) {
      feedbacks[index] = { ...feedbacks[index], ...updatedData };
      this.saveAllFeedbacks(feedbacks);
      return feedbacks[index];
    }
    return null;
  }

  // Delete feedback by ID
  deleteFeedback(id) {
    const feedbacks = this.getAllFeedbacks();
    const filteredFeedbacks = feedbacks.filter(feedback => feedback.id !== id);
    this.saveAllFeedbacks(filteredFeedbacks);
    return filteredFeedbacks.length < feedbacks.length;
  }

  // Clear all feedbacks
  clearAllFeedbacks() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.versionKey);
  }

  // Get storage statistics
  getStorageStats() {
    const feedbacks = this.getAllFeedbacks();
    const storageSize = JSON.stringify(feedbacks).length;
    
    return {
      count: feedbacks.length,
      storageSize: storageSize,
      storageSizeKB: Math.round(storageSize / 1024 * 100) / 100,
      lastUpdated: localStorage.getItem(this.versionKey) || null
    };
  }

  // Export data as JSON
  exportData() {
    const feedbacks = this.getAllFeedbacks();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      feedbacks: feedbacks
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Import data from JSON
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      if (data.feedbacks && Array.isArray(data.feedbacks)) {
        this.saveAllFeedbacks(data.feedbacks);
        return { success: true, count: data.feedbacks.length };
      }
      return { success: false, error: 'Invalid data format' };
    } catch (error) {
      return { success: false, error: 'Invalid JSON format' };
    }
  }

  // Search feedbacks
  searchFeedbacks(query, sentiment = null) {
    const feedbacks = this.getAllFeedbacks();
    const searchTerm = query.toLowerCase();
    
    return feedbacks.filter(feedback => {
      // Text search in content fields
      const textMatch = !query || 
        (feedback.favouriteItem && feedback.favouriteItem.toLowerCase().includes(searchTerm)) ||
        (feedback.improvements && feedback.improvements.toLowerCase().includes(searchTerm)) ||
        (feedback.mealPreference && feedback.mealPreference.toLowerCase().includes(searchTerm));
      
      // Sentiment filter
      const sentimentMatch = !sentiment || feedback.sentiment?.label === sentiment;
      
      return textMatch && sentimentMatch;
    });
  }

  // Calculate analytics
  calculateAnalytics() {
    const feedbacks = this.getAllFeedbacks();
    
    if (feedbacks.length === 0) {
      return {
        count: 0,
        averages: {},
        sentiment: { positive: 0, neutral: 0, negative: 0, averageScore: 0 }
      };
    }

    // Calculate averages for numeric fields
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

    // Calculate sentiment distribution
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
  }
}

// Create global instance
window.FeedbackStorage = new FeedbackStorage();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeedbackStorage;
}

