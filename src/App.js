import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FeedbackForm from './components/FeedbackForm';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import RequireAuth from './components/RequireAuth';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<FeedbackForm />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

