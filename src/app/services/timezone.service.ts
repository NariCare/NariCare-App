import { Injectable } from '@angular/core';

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  country?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimezoneService {

  // Common timezones relevant to NariCare users (cleaned up for better UX)
  private readonly COMMON_TIMEZONES: TimezoneOption[] = [
    // Primary markets first
    { value: 'Asia/Kolkata', label: 'India (IST)', offset: '+05:30', country: 'India' },
    { value: 'Asia/Dubai', label: 'UAE (GST)', offset: '+04:00', country: 'UAE' },
    
    // Middle East (grouped by actual offset)
    { value: 'Asia/Qatar', label: 'Qatar (AST)', offset: '+03:00', country: 'Qatar' },
    { value: 'Asia/Kuwait', label: 'Kuwait (AST)', offset: '+03:00', country: 'Kuwait' },
    { value: 'Asia/Riyadh', label: 'Saudi Arabia (AST)', offset: '+03:00', country: 'Saudi Arabia' },
    
    // United States
    { value: 'America/New_York', label: 'US Eastern Time', offset: 'varies', country: 'United States' },
    { value: 'America/Chicago', label: 'US Central Time', offset: 'varies', country: 'United States' },
    { value: 'America/Denver', label: 'US Mountain Time', offset: 'varies', country: 'United States' },
    { value: 'America/Los_Angeles', label: 'US Pacific Time', offset: 'varies', country: 'United States' },
    
    // Europe
    { value: 'Europe/London', label: 'UK (GMT/BST)', offset: 'varies', country: 'United Kingdom' },
    { value: 'Europe/Paris', label: 'France (CET)', offset: 'varies', country: 'France' },
    { value: 'Europe/Berlin', label: 'Germany (CET)', offset: 'varies', country: 'Germany' },
    
    // Asia-Pacific
    { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00', country: 'Singapore' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: '+08:00', country: 'Hong Kong' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)', offset: '+09:00', country: 'Japan' },
    { value: 'Australia/Sydney', label: 'Australia Eastern', offset: 'varies', country: 'Australia' }
  ];

  constructor() {}

  /**
   * Auto-detect user's timezone from browser
   */
  getUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Failed to detect timezone, defaulting to Asia/Kolkata:', error);
      return 'Asia/Kolkata'; // Default for Indian market
    }
  }

  /**
   * Get common timezone options for dropdown
   */
  getCommonTimezones(): TimezoneOption[] {
    return this.COMMON_TIMEZONES;
  }

  /**
   * Get timezone by value
   */
  getTimezoneByValue(value: string): TimezoneOption | undefined {
    return this.COMMON_TIMEZONES.find(tz => tz.value === value);
  }

  /**
   * Format date/time in user's timezone
   */
  formatDateTime(
    date: Date | string, 
    timezone: string = this.getUserTimezone(),
    options: Intl.DateTimeFormatOptions = {}
  ): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };

    const formatOptions = { ...defaultOptions, ...options };
    
    try {
      return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
    } catch (error) {
      console.error('Error formatting date with timezone:', error);
      return dateObj.toLocaleString();
    }
  }

  /**
   * Format time only in user's timezone
   */
  formatTime(
    date: Date | string, 
    timezone: string = this.getUserTimezone(),
    options: Intl.DateTimeFormatOptions = {}
  ): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };

    const formatOptions = { ...defaultOptions, ...options };
    
    try {
      return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
    } catch (error) {
      console.error('Error formatting time with timezone:', error);
      return dateObj.toLocaleTimeString();
    }
  }

  /**
   * Format date only in user's timezone
   */
  formatDate(
    date: Date | string, 
    timezone: string = this.getUserTimezone(),
    options: Intl.DateTimeFormatOptions = {}
  ): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const formatOptions = { ...defaultOptions, ...options };
    
    try {
      return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
    } catch (error) {
      console.error('Error formatting date with timezone:', error);
      return dateObj.toLocaleDateString();
    }
  }

  /**
   * Format consultation time with both user and expert timezone context
   */
  formatConsultationTime(
    utcTime: Date | string,
    userTimezone: string,
    expertTimezone?: string
  ): {
    userTime: string;
    expertTime?: string;
    display: string;
  } {
    const dateObj = typeof utcTime === 'string' ? new Date(utcTime) : utcTime;
    
    const userTime = this.formatDateTime(dateObj, userTimezone, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    let expertTime: string | undefined;
    let display = `Your time: ${userTime}`;

    if (expertTimezone && expertTimezone !== userTimezone) {
      expertTime = this.formatDateTime(dateObj, expertTimezone, {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      display += ` | Expert time: ${expertTime}`;
    }

    return { userTime, expertTime, display };
  }

  /**
   * Convert local time to UTC for API calls
   * Takes a datetime and interprets it as being in the specified timezone,
   * then converts it to UTC
   * 
   * Example: convertToUTC("2025-09-12T09:00:00", "Asia/Kolkata") 
   * should return "2025-09-12T03:30:00.000Z" (9 AM IST = 3:30 AM UTC)
   */
  convertToUTC(localDateTime: string | Date, timezone: string): Date {
    try {
      const inputDate = typeof localDateTime === 'string' ? new Date(localDateTime) : localDateTime;
      
      // Extract the date/time components that we want to interpret as being in the target timezone
      const year = inputDate.getFullYear();
      const month = inputDate.getMonth(); // 0-based
      const day = inputDate.getDate();
      const hours = inputDate.getHours();
      const minutes = inputDate.getMinutes();
      const seconds = inputDate.getSeconds();
      const ms = inputDate.getMilliseconds();
      
      console.log('🕐 Converting to UTC:', {
        input: typeof localDateTime === 'string' ? localDateTime : localDateTime.toISOString(),
        timezone: timezone,
        parsedComponents: `${year}-${month+1}-${day} ${hours}:${minutes}:${seconds}`
      });
      
      // The key insight: We have date/time components that represent a time IN the target timezone
      // We need to find what UTC time would display as these components in that timezone
      
      // Step 1: Create an ISO string with these components
      const isoString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
      
      // Step 2: Treat this as if it were UTC, then adjust for the timezone
      const asIfUTC = new Date(isoString + 'Z'); // Parse as UTC
      
      // Step 3: Calculate the timezone offset for this specific date/time
      // We need to know: if it's currently X time in the target timezone, what time is it in UTC?
      
      // Get the offset by creating a date and seeing how it formats in different timezones
      const referenceDate = new Date(asIfUTC.getTime());
      
      // Format this date in the target timezone
      const inTargetTZ = new Date(referenceDate.toLocaleString('sv-SE', { timeZone: timezone }) + 'Z');
      
      // Format this same date in UTC  
      const inUTC = new Date(referenceDate.toLocaleString('sv-SE', { timeZone: 'UTC' }) + 'Z');
      
      // The difference tells us the offset
      const timezoneOffsetMs = inUTC.getTime() - inTargetTZ.getTime();
      
      // Step 4: Apply the offset
      // If timezone is ahead of UTC (like Asia/Kolkata = UTC+5:30), we need to subtract the offset
      const result = new Date(asIfUTC.getTime() + timezoneOffsetMs);
      
      console.log('🔄 Conversion process:', {
        isoString: isoString,
        asIfUTC: asIfUTC.toISOString(),
        referenceDate: referenceDate.toISOString(),
        inTargetTZ: inTargetTZ.toISOString(),
        inUTC: inUTC.toISOString(),
        timezoneOffsetMs: timezoneOffsetMs,
        timezoneOffsetHours: timezoneOffsetMs / (1000 * 60 * 60),
        result: result.toISOString()
      });
      
      // Verification: format the result back to target timezone to confirm it's correct
      const verification = this.formatDateTime(result, timezone);
      console.log('✅ Verification:', {
        expectedInTargetTZ: `${year}-${month+1}-${day} ${hours}:${minutes}:${seconds}`,
        actualInTargetTZ: verification,
        matches: verification.includes(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`)
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error converting to UTC:', error);
      return typeof localDateTime === 'string' ? new Date(localDateTime) : localDateTime;
    }
  }

  /**
   * Get current timezone offset string
   */
  getCurrentOffset(timezone: string = this.getUserTimezone()): string {
    try {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const targetTime = new Date(utcTime + (this.getTimezoneOffset(timezone) * 60000));
      
      const offset = this.getTimezoneOffset(timezone);
      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset >= 0 ? '+' : '-';
      
      return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error getting timezone offset:', error);
      return '+00:00';
    }
  }

  /**
   * Get timezone offset in minutes
   */
  private getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const targetTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      const localTime = new Date(now.toLocaleString("en-US"));
      
      return (targetTime.getTime() - localTime.getTime()) / (1000 * 60);
    } catch (error) {
      console.error('Error calculating timezone offset:', error);
      return 0;
    }
  }

  /**
   * Validate timezone string
   */
  isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if two timezones are equivalent (handles aliases like Asia/Calcutta vs Asia/Kolkata)
   */
  areTimezonesEquivalent(tz1: string | undefined, tz2: string | undefined): boolean {
    if (!tz1 || !tz2) return false;
    if (tz1 === tz2) return true;
    
    // Handle common timezone aliases
    const aliases: { [key: string]: string[] } = {
      'Asia/Kolkata': ['Asia/Calcutta'],
      'Asia/Calcutta': ['Asia/Kolkata'],
      'Europe/London': ['GB', 'Europe/Belfast'],
      'America/New_York': ['US/Eastern'],
      'America/Chicago': ['US/Central'],
      'America/Denver': ['US/Mountain'],
      'America/Los_Angeles': ['US/Pacific']
    };
    
    // Check if tz2 is an alias of tz1
    if (aliases[tz1] && aliases[tz1].includes(tz2)) {
      return true;
    }
    
    // Check if tz1 is an alias of tz2
    if (aliases[tz2] && aliases[tz2].includes(tz1)) {
      return true;
    }
    
    // Check if they resolve to the same actual timezone by comparing current offset and name
    try {
      const now = new Date();
      const formatter1 = new Intl.DateTimeFormat('en', { timeZone: tz1, timeZoneName: 'long' });
      const formatter2 = new Intl.DateTimeFormat('en', { timeZone: tz2, timeZoneName: 'long' });
      
      const parts1 = formatter1.formatToParts(now);
      const parts2 = formatter2.formatToParts(now);
      
      const name1 = parts1.find(part => part.type === 'timeZoneName')?.value;
      const name2 = parts2.find(part => part.type === 'timeZoneName')?.value;
      
      return name1 === name2;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get timezone display name
   */
  getTimezoneDisplayName(timezone: string): string {
    const commonTimezone = this.getTimezoneByValue(timezone);
    if (commonTimezone) {
      return commonTimezone.label;
    }

    try {
      // Fallback to extracting city name from timezone
      const parts = timezone.split('/');
      return parts[parts.length - 1].replace(/_/g, ' ');
    } catch (error) {
      return timezone;
    }
  }
}