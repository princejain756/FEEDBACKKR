(() => {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const statEls = {
    count: $('[data-stat="count"]'),
    experienceIndex: $('[data-stat="experienceIndex"]'),
    taste: $('[data-stat="taste"]'),
    service: $('[data-stat="service"]'),
    wait: $('[data-stat="wait"]'),
    overall: $('[data-stat="overall"]'),
    sentimentMix: $('[data-stat="sentimentMix"]'),
    avgSent: $('[data-stat="avgSent"]'),
  };

  const logoutBtn = $('#logoutBtn');
  const exportBtn = $('#exportBtn');
  const importBtn = $('#importBtn');
  const clearBtn = $('#clearBtn');
  const importFileInput = $('#importFileInput');
  const subsTable = $('#subsTable tbody');
  const searchInput = $('#search');
  const sentimentFilter = $('#sentimentFilter');

  logoutBtn.addEventListener('click', () => {
    // Since we're using local storage, just redirect to main page
    window.location.href = '/';
  });

  // Export functionality
  exportBtn.addEventListener('click', () => {
    if (!window.FeedbackStorage) {
      alert('Local storage not available');
      return;
    }
    
    const data = window.FeedbackStorage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kriedko-feedback-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import functionality
  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!window.FeedbackStorage) {
          alert('Local storage not available');
          return;
        }

        const result = window.FeedbackStorage.importData(e.target.result);
        if (result.success) {
          alert(`Successfully imported ${result.count} feedback entries`);
          // Refresh the data
          fetchSubmissions();
          updateStats();
        } else {
          alert(`Import failed: ${result.error}`);
        }
      } catch (error) {
        alert('Error reading file: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  });

  // Clear all functionality
  clearBtn.addEventListener('click', () => {
    if (!window.FeedbackStorage) {
      alert('Local storage not available');
      return;
    }

    if (confirm('Are you sure you want to clear all feedback data? This action cannot be undone.')) {
      window.FeedbackStorage.clearAllFeedbacks();
      alert('All feedback data has been cleared');
      // Refresh the data
      fetchSubmissions();
      updateStats();
    }
  });

  let allSubs = [];

  function fmtNum(n) { return (n ?? '') === '' ? '—' : Number(n).toFixed(2); }
  function fmtTime(iso) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }
  function truncate(s, len=120) {
    if (!s) return '';
    return s.length > len ? s.slice(0, len-1) + '…' : s;
  }

  function renderTable() {
    const q = searchInput.value.trim().toLowerCase();
    const sent = sentimentFilter.value;
    const rows = [];
    for (const s of allSubs) {
      if (sent && s.sentiment?.label !== sent) continue;
      const textBank = `${s.favouriteItem || ''} ${s.improvements || ''}`.toLowerCase();
      if (q && !textBank.includes(q)) continue;
      rows.push(`
        <tr>
          <td>${fmtTime(s.createdAt)}</td>
          <td>${s.mealPreference || ''}</td>
          <td>${[s.taste,s.service,s.wait,s.overall].map(v=>v ?? '—').join(' / ')}</td>
          <td>${s.experienceIndex ?? '—'}</td>
          <td title="${(s.favouriteItem||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}">${truncate(s.favouriteItem||'')}</td>
          <td title="${(s.improvements||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}">${truncate(s.improvements||'')}</td>
          <td>
            ${s.sentiment?.label ? `<span class="pill ${s.sentiment.label==='positive'?'pill--pos':s.sentiment.label==='negative'?'pill--neg':'pill--neu'}">${s.sentiment.label}</span>`: ''}
          </td>
        </tr>
      `);
    }
    subsTable.innerHTML = rows.join('');
  }

  searchInput.addEventListener('input', renderTable);
  sentimentFilter.addEventListener('change', renderTable);

  async function fetchSubmissions() {
    // Use local storage directly
    if (window.FeedbackStorage) {
      allSubs = window.FeedbackStorage.getAllFeedbacks();
      // Sort latest first
      allSubs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      renderTable();
    } else {
      console.warn('FeedbackStorage not available');
      allSubs = [];
      renderTable();
    }
  }

  function updateStats(agg) {
    // If no server data, calculate from local storage
    if (!agg || !agg.count) {
      if (window.FeedbackStorage) {
        agg = window.FeedbackStorage.calculateAnalytics();
      } else {
        agg = { count: 0, averages: {}, sentiment: { positive: 0, neutral: 0, negative: 0, averageScore: 0 } };
      }
    }

    statEls.count.textContent = agg.count;
    statEls.experienceIndex.textContent = agg.averages?.experienceIndex?.toFixed?.(2) ?? '—';
    statEls.taste.textContent = agg.averages?.taste?.toFixed?.(2) ?? '—';
    statEls.service.textContent = agg.averages?.service?.toFixed?.(2) ?? '—';
    statEls.wait.textContent = agg.averages?.wait?.toFixed?.(2) ?? '—';
    statEls.overall.textContent = agg.averages?.overall?.toFixed?.(2) ?? '—';
    const s = agg.sentiment || {}; 
    statEls.sentimentMix.textContent = `${s.positive||0} ↑  ·  ${s.neutral||0} •  ${s.negative||0} ↓`;
    statEls.avgSent.textContent = `Avg sentiment: ${(s.averageScore ?? 0).toFixed(2)}`;
  }

  function connectSSE() {
    // Since we're using local storage, just update stats and data periodically
    const updateData = () => {
      updateStats();
      fetchSubmissions();
    };
    
    // Update immediately
    updateData();
    
    // Update every 5 seconds
    setInterval(updateData, 5000);
  }

  // initial load
  fetchSubmissions();
  connectSSE();
})();
