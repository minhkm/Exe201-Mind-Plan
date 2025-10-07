export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Chào buổi sáng';
  } else if (hour < 18) {
    return 'Chào buổi chiều';
  } else {
    return 'Chào buổi tối';
  }
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isSameWeek = (date1: Date, date2: Date): boolean => {
  const startOfWeek1 = getStartOfWeek(date1);
  const startOfWeek2 = getStartOfWeek(date2);
  return startOfWeek1.getTime() === startOfWeek2.getTime();
};

export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
};

export const getEndOfWeek = (date: Date): Date => {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return endOfWeek;
};

export const getWeekDays = (date: Date): Date[] => {
  const startOfWeek = getStartOfWeek(date);
  const days = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }

  return days;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  return addDays(date, weeks * 7);
};

export const getTimeFromString = (timeString: string): { hour: number; minute: number } => {
  const [hour, minute] = timeString.split(':').map(Number);
  return { hour, minute };
};

export const createDateWithTime = (date: Date, timeString: string): Date => {
  const { hour, minute } = getTimeFromString(timeString);
  const newDate = new Date(date);
  newDate.setHours(hour, minute, 0, 0);
  return newDate;
};