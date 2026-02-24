const API = "http://localhost:8080/api/admin";

const getToken = () => localStorage.getItem("sa_token");

export const isLoggedIn = () => !!getToken();

export const adminLogin = async (username, password) => {
    const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) localStorage.setItem("sa_token", data.accessToken);
    return data;
};

export const logout = () => localStorage.removeItem("sa_token");

const authFetch = async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            ...(opts.headers || {}),
        },
    });
    return res.json();
};

export const listSchools = () => authFetch("/schools");
export const getSchool = (id) => authFetch(`/schools/${id}`);
export const updateSchool = (id, body) =>
    authFetch(`/schools/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteSchool = (id) =>
    authFetch(`/schools/${id}`, { method: "DELETE" });
export const setStatus = (id, status) =>
    authFetch(`/schools/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
export const changePassword = (id, newPassword) =>
    authFetch(`/schools/${id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword }),
    });
export const setSessionDuration = (id, hours) =>
    authFetch(`/schools/${id}/session`, {
        method: "PATCH",
        body: JSON.stringify({ hours }),
    });
export const getSessions = (id) => authFetch(`/schools/${id}/sessions`);
export const expireSessions = (id) =>
    authFetch(`/schools/${id}/sessions`, { method: "DELETE" });

export const createPromo = (body) =>
    authFetch(`/promos`, {
        method: "POST",
        body: JSON.stringify(body),
    });
export const listPromos = () => authFetch('/promos');

export const sendNotification = (id, body) =>
    authFetch(`/schools/${id}/notify`, {
        method: "POST",
        body: JSON.stringify(body),
    });
export const clearNotification = (id) =>
    authFetch(`/schools/${id}/notify`, { method: "DELETE" });

// Export triggers browser download
export const downloadExport = async (id) => {
    const res = await fetch(
        `${API}/schools/${id === "all" ? "export/all" : `${id}/export`}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
        res.headers.get("content-disposition")?.split('"')[1] || "backup.json";
    a.click();
    URL.revokeObjectURL(url);
};

export const importSchoolData = async (id, jsonData) =>
    authFetch(`/schools/${id}/import`, {
        method: "POST",
        body: JSON.stringify(jsonData),
    });

// Support Requests
export const listSupportRequests = () => authFetch("/support");
export const resolveSupportRequest = (id) =>
    authFetch(`/support/${id}/resolve`, { method: "PATCH" });
