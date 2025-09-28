import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../hooks/useAuth';
import { fetchSubmissions, fetchAggregates, deleteSubmission as apiDelete, clearAllRemote, importRemoteData } from '../lib/api';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  // Local storage utils kept for export/import fallback
  const {
    feedbacks: localFeedbacks,
    isLoading: isLocalLoading,
    clearAllFeedbacks,
    calculateAnalytics: calculateLocalAnalytics,
    exportData,
    importData,
    deleteFeedback: deleteLocalFeedback,
  } = useLocalStorage();

  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [analytics, setAnalytics] = useState({
    count: 0,
    averages: {},
    sentiment: { positive: 0, neutral: 0, negative: 0, averageScore: 0 }
  });
  const [usingRemote, setUsingRemote] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const loadData = async (mountedRefCheck = () => true) => {
    const res = await fetchSubmissions();
    if (!mountedRefCheck()) return;
    if (res.ok) {
      const list = Array.isArray(res.data) ? res.data : [];
      list.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setSubmissions(list);
      setUsingRemote(true);
      const agg = await fetchAggregates();
      if (agg) setAnalytics(agg);
    } else {
      setSubmissions(localFeedbacks);
      setUsingRemote(false);
      setAnalytics(calculateLocalAnalytics());
    }
  };

  // fetch submissions from server, with fallback to local storage
  useEffect(() => {
    let active = true;
    const check = () => active;
    loadData(check);
    const id = setInterval(() => loadData(check), 10000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // Filter based on search and sentiment
  useEffect(() => {
    const q = (searchQuery || '').toLowerCase();
    const filtered = submissions.filter((f) => {
      const textMatch = !q || (
        (f.favouriteItem || '').toLowerCase().includes(q) ||
        (f.improvements || '').toLowerCase().includes(q) ||
        (f.mealPreference || '').toLowerCase().includes(q)
      );
      const sentOk = !sentimentFilter || (f.sentiment?.label === sentimentFilter);
      return textMatch && sentOk;
    });
    setFilteredFeedbacks(filtered);
  }, [searchQuery, sentimentFilter, submissions]);

  // Recalculate analytics locally when submissions change and remote agg not used
  useEffect(() => {
    if (!usingRemote) {
      setAnalytics(calculateLocalAnalytics());
    }
  }, [usingRemote, submissions, calculateLocalAnalytics]);

  const handleExport = () => {
    const data = usingRemote
      ? JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), feedbacks: submissions }, null, 2)
      : exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kriedko-feedback-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => { fileInputRef.current?.click(); };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e2) => {
      try {
        const parsed = JSON.parse(e2.target.result);
        const list = Array.isArray(parsed?.feedbacks) ? parsed.feedbacks : Array.isArray(parsed) ? parsed : null;
        if (!list) { alert('Invalid data format'); return; }
        if (usingRemote) {
          const r = await importRemoteData(list);
          if (r.ok) {
            alert(`Imported ${r.count || list.length} entries to server`);
            await loadData(() => true);
          } else {
            alert('Import failed on server');
          }
        } else {
          const result = importData(e2.target.result);
          if (result.success) {
            alert(`Successfully imported ${result.count} feedback entries`);
          } else {
            alert(`Import failed: ${result.error}`);
          }
        }
      } catch (error) {
        alert('Error reading file: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all feedback data? This action cannot be undone.')) return;
    if (usingRemote) {
      const ok = await clearAllRemote();
      if (ok) { alert('All remote feedback cleared'); await loadData(() => true); }
      else alert('Remote clear failed');
      return;
    }
    clearAllFeedbacks();
    alert('All local feedback data has been cleared');
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const truncate = (s, len = 120) => {
    if (!s) return '';
    return s.length > len ? s.slice(0, len - 1) + '…' : s;
  };

  const getSentimentClass = (sentiment) => {
    if (!sentiment?.label) return '';
    return `pill pill--${sentiment.label === 'positive' ? 'pos' : 
                          sentiment.label === 'negative' ? 'neg' : 'neu'}`;
  };

  if (isLocalLoading && !usingRemote) {
    return (
      <div className="dashboard-shell">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <header className="admin-header">
        <div>
          <div className="eyebrow">Kriedko Culinary Collective</div>
          <h1>Admin Dashboard</h1>
          <div className="muted">Live insight into guest feedback</div>
        </div>
        <div className="admin-token">
          <button onClick={handleExport} className="export-btn">Export Data</button>
          <button onClick={handleImport} className="import-btn">Import Data</button>
          <button onClick={handleClearAll} className="clear-btn">Clear All</button>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            className="logout-btn"
          >
            Log Out
          </button>
          <Link to="/" className="logout-btn">Back to Form</Link>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="label">Submissions</div>
          <div className="value">{analytics.count}</div>
        </div>
        <div className="stat-card">
          <div className="label">Experience Index</div>
          <div className="value">{analytics.averages.experienceIndex?.toFixed(2) || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Taste</div>
          <div className="value">{analytics.averages.taste?.toFixed(2) || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Service</div>
          <div className="value">{analytics.averages.service?.toFixed(2) || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Wait</div>
          <div className="value">{analytics.averages.wait?.toFixed(2) || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Overall</div>
          <div className="value">{analytics.averages.overall?.toFixed(2) || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="label">Sentiment</div>
          <div className="value">
            {analytics.sentiment.positive} ↑ · {analytics.sentiment.neutral} • {analytics.sentiment.negative} ↓
          </div>
          <div className="muted">Avg: {analytics.sentiment.averageScore?.toFixed(2) || '0.00'}</div>
        </div>
      </section>

      <section className="submissions">
        <div className="submissions__head">
          <h2>Guest Submissions</h2>
          <div className="filter">
            <input
              type="text"
              placeholder="Search text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
            >
              <option value="">All sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Meal</th>
                <th>Ratings (T/S/W/O)</th>
                <th>Experience</th>
                <th>Favourite Item</th>
                <th>Improvements</th>
                <th>Sentiment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map((feedback) => (
                <tr key={feedback.id}>
                  <td>{formatTime(feedback.createdAt)}</td>
                  <td>{feedback.mealPreference || ''}</td>
                  <td>
                    {[feedback.taste, feedback.service, feedback.wait, feedback.overall]
                      .map(v => v ?? '—').join(' / ')}
                  </td>
                  <td>{feedback.experienceIndex?.toFixed(2) || '—'}</td>
                  <td title={feedback.favouriteItem || ''}>
                    {truncate(feedback.favouriteItem || '')}
                  </td>
                  <td title={feedback.improvements || ''}>
                    {truncate(feedback.improvements || '')}
                  </td>
                  <td>
                    {feedback.sentiment?.label && (
                      <span className={getSentimentClass(feedback.sentiment)}>
                        {feedback.sentiment.label}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Delete feedback from ${formatTime(feedback.createdAt)}?`)) return;
                        if (usingRemote) {
                          const ok = await apiDelete(feedback.id);
                          if (ok) { await loadData(() => true); }
                          else alert('Delete failed');
                        } else {
                          deleteLocalFeedback(feedback.id);
                        }
                      }}
                      className="delete-btn"
                      title="Delete this feedback"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default AdminDashboard;
