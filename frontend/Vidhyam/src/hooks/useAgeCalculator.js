import { useMemo } from 'react';

export function useAgeCalculator(dob) {
  return useMemo(() => {
    if (!dob) return { years: null, months: null, days: null, ageString: '' };

    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return { years: null, months: null, days: null, ageString: '' };
    }

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return {
      years,
      months,
      days,
      ageString: `${years} years, ${months} months, ${days} days`,
    };
  }, [dob]);
}
