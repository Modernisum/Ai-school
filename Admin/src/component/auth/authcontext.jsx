// src/services/tokenService.js
let accessToken = null;

// Save token
export const setToken = (token) => {
  accessToken = token;
  localStorage.setItem("accessToken", token);
};

// Get token (from memory or localStorage)
export const getToken = () => {
  if (!accessToken) accessToken = localStorage.getItem("accessToken");
  return accessToken;
};

// Clear token
export const clearToken = () => {
  accessToken = null;
  localStorage.removeItem("accessToken");
};
