/**
 * Centralized utility for consistent baby age calculations across the app
 */
export class AgeCalculatorUtil {
  
  /**
   * Calculate baby's age in a consistent format across the app
   * @param dateOfBirth - Baby's date of birth
   * @param currentDate - Optional current date (defaults to now)
   * @returns Formatted age string
   */
  static calculateBabyAge(dateOfBirth: Date | string, currentDate?: Date): string {
    try {
      const birthDate = new Date(dateOfBirth);
      const today = currentDate || new Date();
      
      // Validate dates
      if (isNaN(birthDate.getTime()) || isNaN(today.getTime())) {
        return 'Invalid date';
      }
      
      const diffTime = today.getTime() - birthDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        // Baby not born yet - show due date
        const daysUntilDue = Math.abs(diffDays);
        if (daysUntilDue < 7) {
          return `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
        } else {
          const weeksUntilDue = Math.floor(daysUntilDue / 7);
          const remainingDays = daysUntilDue % 7;
          if (remainingDays === 0) {
            return `Due in ${weeksUntilDue} week${weeksUntilDue !== 1 ? 's' : ''}`;
          }
          return `Due in ${weeksUntilDue}w ${remainingDays}d`;
        }
      } else {
        // Baby is born - show age
        if (diffDays < 7) {
          return `${diffDays} day${diffDays !== 1 ? 's' : ''} old`;
        } else if (diffDays < 56) { // 8 weeks = 56 days
          const weeks = Math.floor(diffDays / 7);
          const remainingDays = diffDays % 7;
          if (remainingDays === 0) {
            return `${weeks} week${weeks !== 1 ? 's' : ''} old`;
          }
          return `${weeks}w ${remainingDays}d old`;
        } else {
          // For babies older than 8 weeks, show in months and weeks
          const weeks = Math.floor(diffDays / 7);
          if (weeks < 52) {
            const months = Math.floor(weeks / 4);
            const remainingWeeks = weeks % 4;
            if (remainingWeeks === 0) {
              return `${months} month${months !== 1 ? 's' : ''} old`;
            }
            return `${months} month${months !== 1 ? 's' : ''} and ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''} old`;
          } else {
            const years = Math.floor(weeks / 52);
            const remainingWeeks = weeks % 52;
            const months = Math.floor(remainingWeeks / 4);
            return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} month${months !== 1 ? 's' : ''}` : ''} old`;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating baby age:', error);
      return 'Age calculation error';
    }
  }

  /**
   * Calculate age in weeks for growth chart calculations
   * @param dateOfBirth - Baby's date of birth
   * @param measurementDate - Date of measurement (defaults to now)
   * @returns Age in weeks
   */
  static calculateAgeInWeeks(dateOfBirth: Date | string, measurementDate?: Date): number {
    try {
      const birthDate = new Date(dateOfBirth);
      const measureDate = measurementDate || new Date();
      
      if (isNaN(birthDate.getTime()) || isNaN(measureDate.getTime())) {
        return 0;
      }
      
      const diffTime = measureDate.getTime() - birthDate.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    } catch (error) {
      console.error('Error calculating age in weeks:', error);
      return 0;
    }
  }
}