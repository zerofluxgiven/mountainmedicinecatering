import { 
  formatTime, 
  formatTimeShort, 
  parseTimeToMinutes, 
  formatRecipeTimes,
  formatClockTime,
  formatDateTime,
  parseClockTimeTo24Hour
} from '../timeFormatting';

describe('Time Formatting Utilities', () => {
  describe('formatTime', () => {
    it('should format minutes correctly', () => {
      expect(formatTime(30)).toBe('30 minutes');
      expect(formatTime(1)).toBe('1 minute');
      expect(formatTime(45)).toBe('45 minutes');
    });

    it('should format hours correctly', () => {
      expect(formatTime(60)).toBe('1 hour');
      expect(formatTime(120)).toBe('2 hours');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatTime(90)).toBe('1 hour 30 minutes');
      expect(formatTime(75)).toBe('1 hour 15 minutes');
      expect(formatTime(121)).toBe('2 hours 1 minute');
    });

    it('should handle edge cases', () => {
      expect(formatTime(null)).toBe(null);
      expect(formatTime(undefined)).toBe(null);
      expect(formatTime('string')).toBe(null);
      expect(formatTime(0)).toBe(null);
    });
  });

  describe('formatTimeShort', () => {
    it('should format short time correctly', () => {
      expect(formatTimeShort(30)).toBe('30m');
      expect(formatTimeShort(60)).toBe('1h');
      expect(formatTimeShort(90)).toBe('1h 30m');
      expect(formatTimeShort(75)).toBe('1h 15m');
    });

    it('should handle edge cases', () => {
      expect(formatTimeShort(null)).toBe(null);
      expect(formatTimeShort(undefined)).toBe(null);
    });
  });

  describe('parseTimeToMinutes', () => {
    it('should parse minute patterns', () => {
      expect(parseTimeToMinutes('30 minutes')).toBe(30);
      expect(parseTimeToMinutes('45 min')).toBe(45);
      expect(parseTimeToMinutes('1 minute')).toBe(1);
    });

    it('should parse hour patterns', () => {
      expect(parseTimeToMinutes('1 hour')).toBe(60);
      expect(parseTimeToMinutes('2 hours')).toBe(120);
      expect(parseTimeToMinutes('1 hr')).toBe(60);
    });

    it('should parse combined patterns', () => {
      expect(parseTimeToMinutes('1 hour 30 minutes')).toBe(90);
      expect(parseTimeToMinutes('1h 30m')).toBe(90);
      expect(parseTimeToMinutes('2 hours 15 minutes')).toBe(135);
    });

    it('should handle edge cases', () => {
      expect(parseTimeToMinutes(null)).toBe(null);
      expect(parseTimeToMinutes('')).toBe(null);
      expect(parseTimeToMinutes('invalid')).toBe(null);
    });
  });

  describe('formatRecipeTimes', () => {
    it('should format all recipe times', () => {
      const recipe = {
        prep_time: 30,
        cook_time: 45,
        total_time: 75
      };
      
      const formatted = formatRecipeTimes(recipe);
      expect(formatted.prep).toBe('30 minutes');
      expect(formatted.cook).toBe('45 minutes');
      expect(formatted.total).toBe('1 hour 15 minutes');
    });

    it('should calculate total time if not provided', () => {
      const recipe = {
        prep_time: 20,
        cook_time: 40
      };
      
      const formatted = formatRecipeTimes(recipe);
      expect(formatted.prep).toBe('20 minutes');
      expect(formatted.cook).toBe('40 minutes');
      expect(formatted.total).toBe('1 hour');
    });

    it('should handle missing times', () => {
      const recipe = {
        prep_time: 15
      };
      
      const formatted = formatRecipeTimes(recipe);
      expect(formatted.prep).toBe('15 minutes');
      expect(formatted.cook).toBeUndefined();
      expect(formatted.total).toBeUndefined();
    });
  });

  describe('formatClockTime', () => {
    it('should format 24-hour time to 12-hour with AM/PM', () => {
      expect(formatClockTime('09:00')).toBe('9:00 AM');
      expect(formatClockTime('13:30')).toBe('1:30 PM');
      expect(formatClockTime('00:00')).toBe('12:00 AM');
      expect(formatClockTime('12:00')).toBe('12:00 PM');
      expect(formatClockTime('23:59')).toBe('11:59 PM');
    });

    it('should handle time with seconds', () => {
      expect(formatClockTime('14:30:00')).toBe('2:30 PM');
      expect(formatClockTime('09:15:30')).toBe('9:15 AM');
    });

    it('should handle edge cases', () => {
      expect(formatClockTime(null)).toBe('No time');
      expect(formatClockTime('')).toBe('No time');
      expect(formatClockTime('invalid')).toBe('invalid');
    });
  });

  describe('parseClockTimeTo24Hour', () => {
    it('should parse 12-hour time to 24-hour format', () => {
      expect(parseClockTimeTo24Hour('9:00 AM')).toBe('09:00');
      expect(parseClockTimeTo24Hour('1:30 PM')).toBe('13:30');
      expect(parseClockTimeTo24Hour('12:00 AM')).toBe('00:00');
      expect(parseClockTimeTo24Hour('12:00 PM')).toBe('12:00');
      expect(parseClockTimeTo24Hour('11:59 PM')).toBe('23:59');
    });

    it('should handle lowercase am/pm', () => {
      expect(parseClockTimeTo24Hour('9:00 am')).toBe('09:00');
      expect(parseClockTimeTo24Hour('1:30 pm')).toBe('13:30');
    });

    it('should handle edge cases', () => {
      expect(parseClockTimeTo24Hour(null)).toBe('');
      expect(parseClockTimeTo24Hour('')).toBe('');
      expect(parseClockTimeTo24Hour('invalid')).toBe('invalid');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time together', () => {
      const date = new Date(2024, 2, 15); // March 15, 2024 (months are 0-indexed)
      const result = formatDateTime(date, '14:30');
      expect(result).toContain('March 15, 2024');
      expect(result).toContain('2:30 PM');
    });

    it('should handle date without time', () => {
      const date = new Date(2024, 2, 15); // March 15, 2024
      const result = formatDateTime(date, null);
      expect(result).toContain('March 15, 2024');
      expect(result).not.toContain('PM');
      expect(result).not.toContain('AM');
    });

    it('should handle string dates', () => {
      const result = formatDateTime('2024-03-15T00:00:00', '09:00');
      expect(result).toContain('2024');
      expect(result).toContain('9:00 AM');
    });

    it('should handle no date', () => {
      expect(formatDateTime(null, '14:30')).toBe('No date');
    });
  });
});