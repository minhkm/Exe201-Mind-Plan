import { apiCall, API_ENDPOINTS } from '@/constants/api';
import { getToken } from '@/utils/tokenStorage';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '@/types/task';

export class TaskService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  static async getTasks(params?: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
  }): Promise<Task[]> {
    const searchParams = new URLSearchParams();

    if (params?.startDate) {
      searchParams.append('startDate', params.startDate.toISOString());
    }
    if (params?.endDate) {
      searchParams.append('endDate', params.endDate.toISOString());
    }
    if (params?.category) {
      searchParams.append('category', params.category);
    }

    const endpoint = `${API_ENDPOINTS.TASKS.LIST}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    const response = await apiCall(endpoint, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return response.tasks.map(this.transformTaskFromAPI);
  }

  static async getTask(id: string): Promise<Task> {
    const endpoint = API_ENDPOINTS.TASKS.GET.replace(':id', id);

    const response = await apiCall(endpoint, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.transformTaskFromAPI(response.task);
  }

  static async createTask(taskData: CreateTaskRequest): Promise<Task> {
    // Validate required fields
    if (!taskData.title || !taskData.title.trim()) {
      throw new Error('Title is required');
    }
    if (!taskData.startTime) {
      throw new Error('Start time is required');
    }
    if (!taskData.endTime) {
      throw new Error('End time is required');
    }

    // Based on backend code analysis, server expects: title, startTime, endTime (camelCase)
    // Include all fields in the request, even if empty, to match server expectations
    const requestBody: any = {
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      startTime: taskData.startTime.toISOString(),
      endTime: taskData.endTime.toISOString(),
      category: taskData.category, // Don't set default, use what user selected
      notes: taskData.notes?.trim() || '',
      reminder: taskData.reminder ? taskData.reminder.toISOString() : null,
    };

    console.log('TaskService - Final request body:', JSON.stringify(requestBody, null, 2));
    console.log('TaskService - Request body validation:', {
      hasTitle: !!requestBody.title,
      titleLength: requestBody.title?.length,
      hasStartTime: !!requestBody.startTime,
      hasEndTime: !!requestBody.endTime,
      startTimeValid: !isNaN(new Date(requestBody.startTime).getTime()),
      endTimeValid: !isNaN(new Date(requestBody.endTime).getTime()),
      category: requestBody.category,
    });

    const headers = await this.getAuthHeaders();
    console.log('TaskService - Auth headers:', { hasAuth: !!headers.Authorization });

    try {
      const response = await apiCall(API_ENDPOINTS.TASKS.CREATE, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('TaskService - Task created successfully!');
      return this.transformTaskFromAPI(response.task);
    } catch (error) {
      console.error('TaskService - Create task failed:', {
        error: error.message,
        requestBody: Object.keys(requestBody),
        hasValidTitle: !!requestBody.title && requestBody.title.trim().length > 0,
        hasValidTimes: !!requestBody.startTime && !!requestBody.endTime,
      });

      // Parse server error response to get more details
      if (error.message.includes('overlaps with existing task') && error.response) {
        try {
          const errorData = await error.response.json();
          if (errorData.conflictingTask) {
            const conflictInfo = errorData.conflictingTask;
            error.conflictingTask = {
              id: conflictInfo.id,
              title: conflictInfo.title,
              startTime: new Date(conflictInfo.startTime),
              endTime: new Date(conflictInfo.endTime),
            };
          }
        } catch (parseError) {
          console.error('Failed to parse conflict details:', parseError);
        }
      }

      throw error;
    }

  }

  static async updateTask(taskData: UpdateTaskRequest): Promise<Task> {
    const endpoint = API_ENDPOINTS.TASKS.UPDATE.replace(':id', taskData.id);

    const { id, ...updateData } = taskData;

    const requestBody = {
      ...updateData,
      startTime: updateData.startTime?.toISOString(),
      endTime: updateData.endTime?.toISOString(),
      reminder: updateData.reminder?.toISOString(),
    };

    console.log('TaskService - Update request body:', JSON.stringify(requestBody, null, 2));

    const headers = await this.getAuthHeaders();
    console.log('TaskService - Update auth headers:', { hasAuth: !!headers.Authorization });

    try {
      const response = await apiCall(endpoint, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('TaskService - Task updated successfully!');
      return this.transformTaskFromAPI(response.task);
    } catch (error) {
      console.error('TaskService - Update task failed:', {
        error: error.message,
        requestBody: Object.keys(requestBody),
      });

      throw error;
    }
  }

  static async deleteTask(id: string): Promise<void> {
    const endpoint = API_ENDPOINTS.TASKS.DELETE.replace(':id', id);

    console.log('TaskService - Deleting task:', { id, endpoint });

    const headers = await this.getAuthHeaders();
    console.log('TaskService - Delete auth headers:', { hasAuth: !!headers.Authorization });

    try {
      await apiCall(endpoint, {
        method: 'DELETE',
        headers: headers,
      });

      console.log('TaskService - Task deleted successfully!');
    } catch (error) {
      console.error('TaskService - Delete task failed:', {
        error: error.message,
        taskId: id,
      });

      throw error;
    }
  }

  static async getTasksForDate(date: Date): Promise<Task[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getTasks({
      startDate: startOfDay,
      endDate: endOfDay,
    });
  }

  static async getTasksForWeek(date: Date): Promise<Task[]> {
    const startOfWeek = this.getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getTasks({
      startDate: startOfWeek,
      endDate: endOfWeek,
    });
  }

  private static getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    const startOfWeek = new Date(d.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  private static transformTaskFromAPI(apiTask: any): Task {
    return {
      id: apiTask.id,
      title: apiTask.title,
      description: apiTask.description,
      startTime: new Date(apiTask.startTime),
      endTime: new Date(apiTask.endTime),
      category: apiTask.category,
      notes: apiTask.notes,
      reminder: apiTask.reminder ? new Date(apiTask.reminder) : undefined,
      userId: apiTask.userId,
      createdAt: new Date(apiTask.createdAt),
      updatedAt: new Date(apiTask.updatedAt),
    };
  }
}