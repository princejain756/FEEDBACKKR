import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { postFeedback, fetchAggregates } from '../lib/api';
import '../styles/FeedbackForm.css';

const FeedbackForm = () => {
  const { addFeedback, feedbacks, calculateAnalytics } = useLocalStorage();
  const [formData, setFormData] = useState({
    mealPreference: '',
    taste: null,
    service: null,
    wait: null,
    overall: null,
    favouriteItem: '',
    improvements: ''
  });
  const [progress, setProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [metrics, setMetrics] = useState({
    taste: null,
    service: null,
    wait: null,
    overall: null,
    average: null
  });
  const [allUserMetrics, setAllUserMetrics] = useState({
    taste: null,
    service: null,
    wait: null,
    overall: null,
    average: null
  });

  const updateProgress = () => {
    const totalRequired = 5; // four rating groups + meal preference
    const answeredRatings = Object.values(formData).filter((value) => 
      value !== null && value !== '' && value !== undefined
    ).length;
    const progressPercent = (answeredRatings / totalRequired) * 100;
    setProgress(progressPercent);
  };

  const updateMetrics = () => {
    const newMetrics = {
      taste: formData.taste,
      service: formData.service,
      wait: formData.wait,
      overall: formData.overall,
      average: null
    };

    const values = Object.values(newMetrics).filter((value) => value !== null);
    if (values.length > 0) {
      newMetrics.average = (values.reduce((acc, cur) => acc + cur, 0) / values.length).toFixed(1);
    }

    setMetrics(newMetrics);
  };

  const updateAllUserMetrics = async () => {
    try {
      // First try to fetch community data from API (Supabase)
      const apiAggregates = await fetchAggregates();
      
      if (apiAggregates && apiAggregates.count > 0) {
        // Use API data for community ratings
        const newAllUserMetrics = {
          taste: apiAggregates.averages.taste ? Number(apiAggregates.averages.taste.toFixed(1)) : null,
          service: apiAggregates.averages.service ? Number(apiAggregates.averages.service.toFixed(1)) : null,
          wait: apiAggregates.averages.wait ? Number(apiAggregates.averages.wait.toFixed(1)) : null,
          overall: apiAggregates.averages.overall ? Number(apiAggregates.averages.overall.toFixed(1)) : null,
          average: apiAggregates.averages.experienceIndex ? Number(apiAggregates.averages.experienceIndex.toFixed(1)) : null
        };
        setAllUserMetrics(newAllUserMetrics);
        return;
      }
    } catch (error) {
      console.warn('Failed to fetch community data from API, falling back to local data:', error);
    }

    // Fallback to local storage data
    if (feedbacks.length === 0) {
      setAllUserMetrics({
        taste: null,
        service: null,
        wait: null,
        overall: null,
        average: null
      });
      return;
    }

    const analytics = calculateAnalytics();
    const newAllUserMetrics = {
      taste: analytics.averages.taste ? Number(analytics.averages.taste.toFixed(1)) : null,
      service: analytics.averages.service ? Number(analytics.averages.service.toFixed(1)) : null,
      wait: analytics.averages.wait ? Number(analytics.averages.wait.toFixed(1)) : null,
      overall: analytics.averages.overall ? Number(analytics.averages.overall.toFixed(1)) : null,
      average: analytics.averages.experienceIndex ? Number(analytics.averages.experienceIndex.toFixed(1)) : null
    };

    setAllUserMetrics(newAllUserMetrics);
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (name, value) => {
    const numValue = parseInt(value);
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.mealPreference || !formData.taste || !formData.service || 
        !formData.wait || !formData.overall) {
      alert('Please fill in all required fields');
      return;
    }

    // Calculate experience index
    const ratings = [formData.taste, formData.service, formData.wait, formData.overall];
    const experienceIndex = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    // Prepare feedback data
    const feedbackData = {
      ...formData,
      experienceIndex: experienceIndex,
      sentiment: {
        label: experienceIndex >= 4 ? 'positive' : experienceIndex >= 2.5 ? 'neutral' : 'negative',
        score: experienceIndex
      }
    };

    // Save locally for offline UX
    addFeedback(feedbackData);

    // Also send to server for cross-device aggregation (fire-and-forget)
    postFeedback(feedbackData).catch(() => {});

    // Reset form
    setFormData({
      mealPreference: '',
      taste: null,
      service: null,
      wait: null,
      overall: null,
      favouriteItem: '',
      improvements: ''
    });
    setProgress(0);
    setMetrics({
      taste: null,
      service: null,
      wait: null,
      overall: null,
      average: null
    });

    // Show toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  useEffect(() => {
    updateProgress();
    updateMetrics();
  }, [formData]);

  useEffect(() => {
    updateAllUserMetrics();
  }, [feedbacks]);

  // Load community ratings on component mount
  useEffect(() => {
    updateAllUserMetrics();
  }, []);

  const RatingChip = ({ name, value, label, hint }) => (
    <div className="rating-grid">
      <div className="rating-grid__hint">{hint}</div>
      <div className="rating-chipset">
        {[1, 2, 3, 4, 5].map((rating) => (
          <label key={rating} className={formData[name] === rating ? 'selected' : ''}>
            <input
              type="radio"
              name={name}
              value={rating}
              checked={formData[name] === rating}
              onChange={(e) => handleRatingChange(name, e.target.value)}
            />
            {rating}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page-shell">
      <div className="ambient"></div>
      <div className="ambient ambient--two"></div>

      <main className="hero-card">
        <div className="hero-brand">
          <div className="hero-brand__logo">
            <img src="/kriedko.jpg" alt="Kriedko Logo" />
          </div>
          <div className="hero-brand__copy">
            <div className="eyebrow">Kriedko Culinary Collective</div>
            <h1>Share Your Experience</h1>
            <p className="lede">Help us craft your next flavour adventure</p>
          </div>
        </div>
      </main>

      <section className="form-card">
        <div className="form-card__head">
          <div className="form-badge">Feedback Form</div>
          <div className="form-progress">
            <div className="form-progress__label">Progress</div>
            <div className="form-progress__bar">
              <div 
                className="form-progress__fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset className="fieldset">
            <legend>Meal Preference</legend>
            <div className="dietary-toggle">
              {[
                { value: 'veg', label: 'Veg', icon: '🥗', sub: 'Vegetarian' },
                { value: 'non-veg', label: 'Non‑Veg', icon: '🍗', sub: 'Includes meat/eggs' }
              ].map((option) => (
                <label key={option.value} className={formData.mealPreference === option.value ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="mealPreference"
                    value={option.value}
                    checked={formData.mealPreference === option.value}
                    onChange={(e) => handleInputChange('mealPreference', e.target.value)}
                  />
                  <div className="pill-icon">{option.icon}</div>
                  <div className="label-text">{option.label}</div>
                  <div className="label-sub">{option.sub}</div>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="questions">
            <RatingChip 
              name="taste" 
              value={formData.taste} 
              label="Taste" 
              hint="1. How would you rate the taste of the food?" 
            />
            <RatingChip 
              name="service" 
              value={formData.service} 
              label="Service" 
              hint="2. How would you rate the customer service?" 
            />
            <RatingChip 
              name="wait" 
              value={formData.wait} 
              label="Wait Time" 
              hint="3. Was the wait time reasonable?" 
            />
            <RatingChip 
              name="overall" 
              value={formData.overall} 
              label="Overall Experience" 
              hint="4. How would you rate the overall experience at the truck?" 
            />
          </div>

          <div className="open-questions">
            <div className="open-question">
              <span>5. What was your favourite item on the menu?</span>
              <textarea
                value={formData.favouriteItem}
                onChange={(e) => handleInputChange('favouriteItem', e.target.value)}
                placeholder="Tell us about your favourite dish or drink..."
                rows="4"
              />
            </div>
            <div className="open-question">
              <span>6. Is there anything we can improve upon?</span>
              <textarea
                value={formData.improvements}
                onChange={(e) => handleInputChange('improvements', e.target.value)}
                placeholder="Share your suggestions for improvement..."
                rows="4"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="cta">
              Submit Feedback
            </button>
            <p className="microcopy">
              Your feedback helps us create better experiences
            </p>
          </div>
        </form>
      </section>

      <section className="rating-summary">
        <div className="rating-summary__header">
          <h2>Community Ratings</h2>
          <p>Average ratings from all customers</p>
        </div>
        <div className="rating-summary__grid">
          <div className="rating-card">
            <div className="rating-card__value">
              {allUserMetrics.taste || '—'}<span>/5</span>
            </div>
            <div className="rating-card__label">Taste</div>
          </div>
          <div className="rating-card">
            <div className="rating-card__value">
              {allUserMetrics.service || '—'}<span>/5</span>
            </div>
            <div className="rating-card__label">Service</div>
          </div>
          <div className="rating-card">
            <div className="rating-card__value">
              {allUserMetrics.wait || '—'}<span>/5</span>
            </div>
            <div className="rating-card__label">Wait Time</div>
          </div>
          <div className="rating-card">
            <div className="rating-card__value">
              {allUserMetrics.overall || '—'}<span>/5</span>
            </div>
            <div className="rating-card__label">Overall</div>
          </div>
          <div className="rating-card rating-card--average">
            <div className="rating-card__value">
              {allUserMetrics.average || '—'}<span>/5</span>
            </div>
            <div className="rating-card__label">Average</div>
          </div>
        </div>
      </section>

      <Link to="/admin" className="admin-link">
        Admin Dashboard
      </Link>

      {showToast && (
        <div className="toast" role="status" aria-live="polite">
          <div className="toast__icon" aria-hidden="true">✨</div>
          <div className="toast__content">
            <p className="toast__title">Thank you for sharing!</p>
            <p className="toast__body">We can't wait to craft your next flavour adventure.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackForm;
