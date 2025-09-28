const form = document.getElementById("feedbackForm");
const progressFill = document.querySelector("[data-progress-fill]");
const metricEls = document.querySelectorAll("[data-metric]");
const toast = document.querySelector(".toast");

const metricState = {
  taste: null,
  service: null,
  wait: null,
  overall: null,
};

const ratingInputs = form.querySelectorAll('input[type="radio"]');

const updateProgress = () => {
  const totalRequired = 4 + 1; // four rating groups + meal preference
  const answeredRatings = Object.values(metricState).filter((value) => value !== null).length;
  const mealSelected = form.elements["mealPreference"].value ? 1 : 0;
  const progressPercent = ((answeredRatings + mealSelected) / totalRequired) * 100;
  progressFill.style.width = `${progressPercent}%`;
};

const renderMetrics = () => {
  metricEls.forEach((entry) => {
    const key = entry.dataset.metric;
    if (key === "average") {
      const values = Object.values(metricState).filter((value) => value !== null);
      entry.textContent = values.length
        ? `${(values.reduce((acc, cur) => acc + cur, 0) / values.length).toFixed(1)} / 5`
        : "—";
      return;
    }

    const metricValue = metricState[key];
    entry.textContent = metricValue ? `${metricValue} / 5` : "—";
  });
};

const showToast = () => {
  toast.hidden = false;
  toast.dataset.open = "true";

  window.setTimeout(() => {
    toast.dataset.open = "false";
    window.setTimeout(() => {
      toast.hidden = true;
    }, 200);
  }, 3800);
};

ratingInputs.forEach((input) => {
  input.addEventListener("change", (event) => {
    const { name, value } = event.target;
    if (metricState.hasOwnProperty(name)) {
      metricState[name] = Number(value);
      renderMetrics();
    }
    updateProgress();
  });
});

Array.from(form.elements["mealPreference"]).forEach((input) => {
  input.addEventListener("change", updateProgress);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  // Calculate experience index (average of all ratings)
  const ratings = [payload.taste, payload.service, payload.wait, payload.overall]
    .map(r => parseFloat(r))
    .filter(r => !isNaN(r));
  
  const experienceIndex = ratings.length > 0 
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
    : null;

  // Prepare feedback data for local storage
  const feedbackData = {
    ...payload,
    taste: payload.taste ? parseFloat(payload.taste) : null,
    service: payload.service ? parseFloat(payload.service) : null,
    wait: payload.wait ? parseFloat(payload.wait) : null,
    overall: payload.overall ? parseFloat(payload.overall) : null,
    experienceIndex: experienceIndex,
    // Add sentiment analysis (simple implementation)
    sentiment: {
      label: experienceIndex >= 4 ? 'positive' : experienceIndex >= 2.5 ? 'neutral' : 'negative',
      score: experienceIndex
    }
  };

  // Save to local storage
  if (window.FeedbackStorage) {
    window.FeedbackStorage.addFeedback(feedbackData);
    console.log('Feedback saved to local storage');
  }

  console.table(payload);

  form.reset();
  Object.keys(metricState).forEach((key) => {
    metricState[key] = null;
  });
  renderMetrics();
  updateProgress();
  showToast();
});

renderMetrics();
updateProgress();

