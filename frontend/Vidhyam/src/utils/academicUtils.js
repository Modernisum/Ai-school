/**
 * Academic Utilities for derivation logic.
 */

export const CLASS_LEVELS = [
    { label: "Primary (Up to Class 5)", value: 5 },
    { label: "Junior (Up to Class 8)", value: 8 },
    { label: "High School (Up to Class 10)", value: 10 },
    { label: "Intermediate (Up to Class 12)", value: 12 },
];

export const getClassesByLevel = (level) => {
    const baseClasses = ["Nursery", "LKG", "UKG"];
    const numericLevels = parseInt(level) || 0;
    const classes = [...baseClasses];
    for (let i = 1; i <= numericLevels; i++) {
        classes.push(`Class ${i}`);
    }
    return classes;
};

export const getSectionForRoll = (roll) => {
    if (roll <= 0) return "A";
    const index = Math.floor((roll - 1) / 60);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return alphabet[index] || "Z";
};
