export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category: TaskCategory;
  notes?: string;
  reminder?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskCategory {
  MEETING = 'meeting',
  PERSONAL = 'personal',
  OTHER = 'other',
  WEEKEND = 'weekend',
  COOKING = 'cooking',
}

export const TaskCategoryLabels: Record<TaskCategory, string> = {
  [TaskCategory.MEETING]: 'Cuộc họp',
  [TaskCategory.PERSONAL]: 'Đi chơi',
  [TaskCategory.OTHER]: 'Khác',
  [TaskCategory.WEEKEND]: 'Cuối tuần',
  [TaskCategory.COOKING]: 'Nấu ăn',
};

export const TaskCategoryColors: Record<TaskCategory, string> = {
  [TaskCategory.MEETING]: '#3B82F6',     // Blue - Cuộc họp
  [TaskCategory.PERSONAL]: '#06B6D4',    // Cyan - Đi chơi
  [TaskCategory.OTHER]: '#8B5CF6',       // Purple - Khác
  [TaskCategory.WEEKEND]: '#F59E0B',     // Orange - Cuối tuần
  [TaskCategory.COOKING]: '#EF4444',     // Red - Nấu ăn
};

export interface CreateTaskRequest {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category: TaskCategory;
  notes?: string;
  reminder?: Date;
}

export interface UpdateTaskRequest {
  id: string;
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  category?: TaskCategory;
  notes?: string;
  reminder?: Date;
}

export enum ViewMode {
  DAY = 'day',
  WEEK = 'week',
}

export const TimeSlots = [
  '08:00',
  '10:00',
  '12:00',
  '14:00',
  '16:00',
  '18:00',
  '20:00',
];