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

export const formatClassName = (classId) => {
    if (!classId) return 'N/A';
    const formatted = classId
        .replace('class-', 'Class ')
        .replace('pre-nursery', 'Pre-Nursery')
        .replace('nursery', 'Nursery')
        .replace('kindergarten', 'Kindergarten')
        .replace('-commerce', ' (Commerce)')
        .replace('-science', ' (Science)')
        .replace('-humanities', ' (Humanities)');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
};

export const formatTimestamp = (date) => {
    return formatDateTime(date); // alias
};

export function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}
