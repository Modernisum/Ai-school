const HOST = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
const API = `http://${HOST}:8080/api/admin`;

const getToken = () => {
    return localStorage.getItem("sa_token");
};

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

export const getAdminProfile = () => authFetch("/profile");

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
export const getPromoUsage = (id) => authFetch(`/promos/${id}/usage`);
export const applyPromo = (schoolId, code) =>
    authFetch(`/schools/${schoolId}/apply-promo`, {
        method: "POST",
        body: JSON.stringify({ code }),
    });

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

export const processRefund = (schoolId, body) =>
    authFetch(`/schools/${schoolId}/refund`, {
        method: "POST",
        body: JSON.stringify(body),
    });

export const getWalletLedger = (schoolId) =>
    authFetch(`/schools/${schoolId}/ledger`);

export const getChurnRadar = () => authFetch("/churn-radar");
export const manualBackup = () => authFetch("/backup", { method: "POST" });

export const updateAdminCredentials = async (body) => {
    const res = await fetch(`${API}/update-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return res.json();
};

export const uploadFile = async (file, schoolId = "superadmin", userId = "superadmin", userType = "superadmin") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("schoolId", schoolId);
    formData.append("userId", userId);
    formData.append("userType", userType);

    const res = await fetch(`http://${HOST}:8080/api/storage/upload`, {
        method: "POST",
        body: formData,
    });
    const data = await res.json();
    if (res.ok && data.url) {
        return { success: true, url: data.url };
    }
    return { success: false, message: data.message || 'Upload failed' };
};

export const deleteFileByUrl = async (url) => {
    const res = await fetch(`http://${HOST}:8080/api/storage/file-by-url?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    });
    return res.json();
};

