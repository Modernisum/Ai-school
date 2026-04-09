// Utility functions and constants for employeeprofile component

// --- API Configuration ---
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const EMPLOYEES_API_URL = `${API_BASE_URL}/employees`;
export const RESPONSIBILITY_API_URL = `${API_BASE_URL}/responsibility`;
export const ATTENDANCE_API_URL = `${API_BASE_URL}/attendance`;
export const AWARDS_API_URL = `${API_BASE_URL}/award`;
export const FEES_API_URL = `${API_BASE_URL}/fees`;
export const COMPLAINS_API_URL = `${API_BASE_URL}/complains`;
export const EXAM_API_URL = `${API_BASE_URL}/exam`;
export const DOCUMENTS_API_URL = `${API_BASE_URL}/documentbox`;

export const MAX_RETRIES = 3;

// **AUTO School ID Management**
export const getSchoolIdFromStorage = () => {
    try {
        const possibleKeys = [
            'schoolId', 'school_id', 'currentSchoolId', 'selectedSchoolId', 'userSchoolId', 'SCHOOL_ID'
        ];

        for (const key of possibleKeys) {
            const value = localStorage.getItem(key);
            if (value && value !== 'undefined' && value !== 'null' && value.trim() !== '') {
                return value.trim();
            }
        }

        const userData = localStorage.getItem('userData') || localStorage.getItem('user');
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                if (parsed.schoolId) return parsed.schoolId;
                if (parsed.school_id) return parsed.school_id;
            } catch (e) { }
        }

        return null;
    } catch (error) {
        console.error('Error reading School ID from localStorage:', error);
        return null;
    }
};

export const DEFAULT_SCHOOL_ID = "";

// Helper Functions
export const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateValue = date._seconds ? date._seconds * 1000 : date;
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj)) return 'Invalid Date';
    return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const formatDateTime = (date) => {
    if (!date) return 'N/A';
    const dateValue = typeof date === 'string' ? new Date(date) : (date._seconds ? date._seconds * 1000 : date);
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj)) return 'Invalid Date';
    return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const formatTime = (time) => {
    if (!time) return 'N/A';
    const timeValue = time._seconds ? time._seconds * 1000 : time;
    const timeObj = new Date(timeValue);
    if (isNaN(timeObj)) return 'Invalid Time';
    return timeObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

export const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
};

// API call with exponential backoff
export const callApiWithBackoff = async (apiUrl, options = {}) => {
    let lastError = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            if (i > 0) {
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const response = await fetch(apiUrl, options);
            let result;

            try {
                result = await response.json();
            } catch (e) {
                const text = await response.text();
                if (!response.ok) {
                    throw new Error(`HTTP Error ${response.status}: ${text.substring(0, 100)}...`);
                }
                return { success: true, data: [], message: "Operation completed successfully." };
            }

            if (response.ok) {
                return result;
            } else {
                const errorMessage = result.message || result.error || `HTTP Error ${response.status}`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            lastError = error;
            if (i === MAX_RETRIES - 1) {
                throw new Error(`${lastError.message}`);
            }
        }
    }
};

// Employee Types Configuration
export const EMPLOYEE_TYPES = {
    'Teacher': { icon: 'GraduationCap', color: 'bg-blue-100 text-blue-800' },
    'Principal': { icon: 'User', color: 'bg-purple-100 text-purple-800' },
    'Vice Principal': { icon: 'User', color: 'bg-indigo-100 text-indigo-800' },
    'Admin Staff': { icon: 'Building', color: 'bg-gray-100 text-gray-800' },
    'Peon': { icon: 'User', color: 'bg-green-100 text-green-800' },
    'Security Guard': { icon: 'Badge', color: 'bg-orange-100 text-orange-800' },
    'Librarian': { icon: 'BookOpen', color: 'bg-pink-100 text-pink-800' },
    'Lab Assistant': { icon: 'User', color: 'bg-cyan-100 text-cyan-800' },
    'Sports Coach': { icon: 'Trophy', color: 'bg-yellow-100 text-yellow-800' },
    'Counselor': { icon: 'User', color: 'bg-teal-100 text-teal-800' }
};