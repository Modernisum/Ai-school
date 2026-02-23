// src/component/space/api.js


const API_BASE = process.env.REACT_APP_API_BASE_URL; // ✅ Unified backend

// ----------------- Helper -----------------
const apiRequest = async (url, method, data = null) => {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (data) {
    options.body = JSON.stringify(data);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "API Error" }));
    throw { response: { data: error } };
  }
  const resData = await response.json();
  return { data: resData };
};

// ----------------- Categories -----------------
export const fetchCategories = () => {
  return apiRequest(`${API_BASE}/categories`, "GET");
};

export const addCategory = (data) => {
  return apiRequest(`${API_BASE}/categories`, "POST", data);
};

export const updateCategory = (categoryId, data) => {
  return apiRequest(`${API_BASE}/categories/${categoryId}`, "PUT", data);
};

export const deleteCategory = (categoryId) => {
  return apiRequest(`${API_BASE}/categories/${categoryId}`, "DELETE");
};

// ----------------- Spaces -----------------
export const fetchSpacesByCategory = (categoryId) => {
  return apiRequest(`${API_BASE}/categories/${categoryId}/spaces`, "GET");
};

export const addSpace = (categoryId, data) => {
  return apiRequest(`${API_BASE}/categories/${categoryId}/spaces`, "POST", data);
};

export const updateSpace = (categoryId, spaceId, data) => {
  return apiRequest(
    `${API_BASE}/categories/${categoryId}/spaces/${spaceId}`,
    "PUT",
    data
  );
};

export const deleteSpace = (categoryId, spaceId) => {
  return apiRequest(`${API_BASE}/categories/${categoryId}/spaces/${spaceId}`, "DELETE");
};

// ----------------- Materials -----------------
export const fetchAllMaterials = () => {
  return apiRequest(`${API_BASE}/materials`, "GET");
};

export const fetchMaterialById = (materialId) => {
  return apiRequest(`${API_BASE}/materials/${materialId}`, "GET");
};

export const addMaterial = (data) => {
  return apiRequest(`${API_BASE}/materials`, "POST", data);
};

export const updateMaterial = (materialId, data) => {
  return apiRequest(`${API_BASE}/materials/${materialId}`, "PUT", data);
};

export const deleteMaterial = (materialId) => {
  return apiRequest(`${API_BASE}/materials/${materialId}`, "DELETE");
};

// ----------------- Material Transactions (Buy / Sell / Use) -----------------
export const addBuyRecord = (materialId, data) => {
  return apiRequest(`${API_BASE}/materials/${materialId}/buy`, "POST", data);
};

export const addSellRecord = (materialId, data) => {
  return apiRequest(`${API_BASE}/materials/${materialId}/sell`, "POST", data);
};

export const addUseRecord = (materialId, data) => {
  return apiRequest(`${API_BASE}/materials/${materialId}/use`, "POST", data);
};
