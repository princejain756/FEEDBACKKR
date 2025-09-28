import React from 'react';
import { Navigate } from 'react-router-dom';
import { requireAuth } from '../hooks/useAuth';

const RequireAuth = ({ children }) => {
  const ok = requireAuth();
  if (!ok) return <Navigate to="/login" replace />;
  return children;
};

export default RequireAuth;

