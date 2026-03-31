import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectCurrentToken, selectSchoolId } from '../features/auth/authSlice';

const ProtectedRoute = ({ children }) => {
  const token = useSelector(selectCurrentToken);
  const schoolId = useSelector(selectSchoolId);
  const location = useLocation();

  if (!token || !schoolId) {
    // Redirect to login but save the current location they were trying to access
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
