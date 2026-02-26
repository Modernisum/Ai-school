export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";
export const MAX_RETRIES = 3;
export const DEFAULT_SCHOOL_ID = "622079";

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

export const callApiWithBackoff = async (apiUrl, options = {}) => {
    let lastError = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            if (i > 0) {
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const response = await fetch(apiUrl, options);
            const responseClone = response.clone();

            if (!response.ok) {
                let errorText;
                try {
                    const errorData = await response.json();
                    errorText = errorData.message || errorData.error || `HTTP Error ${response.status}`;
                } catch {
                    errorText = await responseClone.text();
                }
                throw new Error(errorText);
            }

            let result;
            try {
                result = await response.json();
            } catch (e) {
                try {
                    const text = await responseClone.text();
                    if (text.trim()) {
                        throw new Error(`Expected JSON response but got: ${text.substring(0, 100)}...`);
                    }
                    return { success: true, message: "Operation completed successfully." };
                } catch (textError) {
                    throw new Error(`Failed to parse response: ${e.message}`);
                }
            }

            return result;
        } catch (error) {
            lastError = error;
            if (i === MAX_RETRIES - 1) {
                throw new Error(`${lastError.message}`);
            }
        }
    }
};
