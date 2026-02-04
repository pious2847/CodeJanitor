/**
 * Timezone Manager Service
 * 
 * Provides timezone-aware scheduling, reporting, and time conversion
 * for distributed teams across different timezones.
 * Requirements: 10.7
 */

export interface TimezoneInfo {
  timezone: string;
  offset: number; // Offset in minutes from UTC
  abbreviation: string;
  isDST: boolean;
}

export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  scheduledTime: Date;
  timezone: string;
  recurrence?: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface TimezonePreference {
  userId: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

/**
 * Timezone Manager Service
 */
export class TimezoneManager {
  private userPreferences: Map<string, TimezonePreference> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();

  /**
   * Set user timezone preference
   */
  setUserTimezone(userId: string, timezone: string, dateFormat: string = 'MM/DD/YYYY', timeFormat: '12h' | '24h' = '12h'): void {
    this.userPreferences.set(userId, {
      userId,
      timezone,
      dateFormat,
      timeFormat,
    });
  }

  /**
   * Get user timezone preference
   */
  getUserTimezone(userId: string): TimezonePreference | undefined {
    return this.userPreferences.get(userId);
  }

  /**
   * Convert date to user's timezone
   */
  convertToUserTimezone(date: Date, userId: string): Date {
    const preference = this.userPreferences.get(userId);
    if (!preference) {
      return date;
    }

    // Get timezone offset
    const userOffset = this.getTimezoneOffset(preference.timezone);
    const localOffset = date.getTimezoneOffset();
    
    // Calculate difference and adjust
    const diffMinutes = userOffset - localOffset;
    const adjustedDate = new Date(date.getTime() + diffMinutes * 60000);
    
    return adjustedDate;
  }

  /**
   * Format date for user's timezone and preferences
   */
  formatDateForUser(date: Date, userId: string): string {
    const preference = this.userPreferences.get(userId);
    const userDate = this.convertToUserTimezone(date, userId);
    
    if (!preference) {
      return userDate.toLocaleString();
    }

    const options: Intl.DateTimeFormatOptions = {
      timeZone: preference.timezone,
      hour12: preference.timeFormat === '12h',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };

    return userDate.toLocaleString('en-US', options);
  }

  /**
   * Get timezone information
   */
  getTimezoneInfo(timezone: string): TimezoneInfo {
    const now = new Date();
    const offset = this.getTimezoneOffset(timezone);
    
    return {
      timezone,
      offset,
      abbreviation: this.getTimezoneAbbreviation(timezone),
      isDST: this.isDaylightSavingTime(timezone, now),
    };
  }

  /**
   * Schedule a task with timezone awareness
   */
  scheduleTask(
    name: string,
    description: string,
    scheduledTime: Date,
    timezone: string,
    recurrence?: 'daily' | 'weekly' | 'monthly'
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: this.generateTaskId(),
      name,
      description,
      scheduledTime,
      timezone,
      recurrence,
      enabled: true,
      nextRun: this.calculateNextRun(scheduledTime, timezone, recurrence),
    };

    this.scheduledTasks.set(task.id, task);
    return task;
  }

  /**
   * Get scheduled tasks
   */
  getScheduledTasks(timezone?: string): ScheduledTask[] {
    let tasks = Array.from(this.scheduledTasks.values());
    
    if (timezone) {
      tasks = tasks.filter(t => t.timezone === timezone);
    }
    
    return tasks.sort((a, b) => {
      const aNext = a.nextRun?.getTime() || 0;
      const bNext = b.nextRun?.getTime() || 0;
      return aNext - bNext;
    });
  }

  /**
   * Update task schedule
   */
  updateTaskSchedule(taskId: string, scheduledTime: Date, timezone?: string): void {
    const task = this.scheduledTasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.scheduledTime = scheduledTime;
    if (timezone) {
      task.timezone = timezone;
    }
    task.nextRun = this.calculateNextRun(scheduledTime, task.timezone, task.recurrence);
    
    this.scheduledTasks.set(taskId, task);
  }

  /**
   * Mark task as run
   */
  markTaskRun(taskId: string): void {
    const task = this.scheduledTasks.get(taskId);
    if (!task) {
      return;
    }

    task.lastRun = new Date();
    task.nextRun = this.calculateNextRun(task.scheduledTime, task.timezone, task.recurrence);
    
    this.scheduledTasks.set(taskId, task);
  }

  /**
   * Get tasks due for execution
   */
  getDueTasks(): ScheduledTask[] {
    const now = new Date();
    
    return Array.from(this.scheduledTasks.values()).filter(task => {
      if (!task.enabled || !task.nextRun) {
        return false;
      }
      
      return task.nextRun <= now;
    });
  }

  /**
   * Convert time between timezones
   */
  convertBetweenTimezones(date: Date, fromTimezone: string, toTimezone: string): Date {
    const fromOffset = this.getTimezoneOffset(fromTimezone);
    const toOffset = this.getTimezoneOffset(toTimezone);
    
    const diffMinutes = toOffset - fromOffset;
    return new Date(date.getTime() + diffMinutes * 60000);
  }

  /**
   * Get meeting time suggestions for multiple timezones
   */
  suggestMeetingTimes(
    timezones: string[],
    workingHoursStart: number = 9, // 9 AM
    workingHoursEnd: number = 17, // 5 PM
    durationMinutes: number = 60
  ): Date[] {
    const suggestions: Date[] = [];
    const now = new Date();
    
    // Check next 7 days
    for (let day = 0; day < 7; day++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + day);
      
      // Check each hour in working hours
      for (let hour = workingHoursStart; hour <= workingHoursEnd - (durationMinutes / 60); hour++) {
        checkDate.setHours(hour, 0, 0, 0);
        
        // Check if this time works for all timezones
        const worksForAll = timezones.every(tz => {
          const localTime = this.convertBetweenTimezones(checkDate, 'UTC', tz);
          const localHour = localTime.getHours();
          return localHour >= workingHoursStart && localHour < workingHoursEnd;
        });
        
        if (worksForAll) {
          suggestions.push(new Date(checkDate));
        }
      }
    }
    
    return suggestions.slice(0, 10); // Return top 10 suggestions
  }

  /**
   * Private helper methods
   */

  private getTimezoneOffset(timezone: string): number {
    // This is a simplified implementation
    // In production, use a library like moment-timezone or date-fns-tz
    const timezoneOffsets: Record<string, number> = {
      'UTC': 0,
      'America/New_York': -300, // EST
      'America/Chicago': -360, // CST
      'America/Denver': -420, // MST
      'America/Los_Angeles': -480, // PST
      'Europe/London': 0, // GMT
      'Europe/Paris': 60, // CET
      'Asia/Tokyo': 540, // JST
      'Asia/Shanghai': 480, // CST
      'Australia/Sydney': 660, // AEDT
    };
    
    return timezoneOffsets[timezone] || 0;
  }

  private getTimezoneAbbreviation(timezone: string): string {
    const abbreviations: Record<string, string> = {
      'UTC': 'UTC',
      'America/New_York': 'EST',
      'America/Chicago': 'CST',
      'America/Denver': 'MST',
      'America/Los_Angeles': 'PST',
      'Europe/London': 'GMT',
      'Europe/Paris': 'CET',
      'Asia/Tokyo': 'JST',
      'Asia/Shanghai': 'CST',
      'Australia/Sydney': 'AEDT',
    };
    
    return abbreviations[timezone] || 'UTC';
  }

  private isDaylightSavingTime(_timezone: string, _date: Date): boolean {
    // Simplified implementation
    // In production, use a proper timezone library
    return false;
  }

  private calculateNextRun(
    scheduledTime: Date,
    _timezone: string,
    recurrence?: 'daily' | 'weekly' | 'monthly'
  ): Date {
    const now = new Date();
    let nextRun = new Date(scheduledTime);
    
    if (!recurrence) {
      return nextRun > now ? nextRun : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    
    // Calculate next occurrence based on recurrence
    while (nextRun <= now) {
      switch (recurrence) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }
    }
    
    return nextRun;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
