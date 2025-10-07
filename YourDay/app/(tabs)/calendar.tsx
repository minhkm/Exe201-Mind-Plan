import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Task, ViewMode, TaskCategory, TaskCategoryColors } from '@/types/task';
import {
  formatDate,
  formatTime,
  getGreeting,
  isToday,
  addDays,
  addWeeks,
  getWeekDays,
  createDateWithTime,
} from '@/utils/dateUtils';
import { getUser } from '@/utils/tokenStorage';
import { logout } from '@/utils/auth';
import { TaskService } from '@/services/taskService';

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DAY);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [currentDate, viewMode]); // Reload when date or view mode changes

  // Reload tasks when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, [currentDate, viewMode])
  );

  const loadUserData = async () => {
    try {
      const user = await getUser();
      if (user) {
        setUserName(user.firstName);
      }
    } catch (error) {
      console.error('Load user error:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);

      let startDate: Date, endDate: Date;

      if (viewMode === ViewMode.DAY) {
        // Load tasks for the current day
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);
      } else {
        // Load tasks for the current week
        const startOfWeek = getStartOfWeek(currentDate);
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endDate = new Date(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate(), 23, 59, 59);
      }

      const tasksData = await TaskService.getTasks({
        startDate,
        endDate,
      });

      setTasks(tasksData);
    } catch (error) {
      console.error('Load tasks error:', error);
      // If API fails, show empty array instead of mock data
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    const startOfWeek = new Date(d.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  };

  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter(task => {
      const taskDate = new Date(task.startTime);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  // Generate hourly time slots from 6 AM to 11 PM
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 6; hour <= 23; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(timeString);
    }
    return slots;
  };

  const getTasksForTimeSlot = (date: Date, timeSlot: string): Task[] => {
    const slotTime = createDateWithTime(date, timeSlot);
    const nextSlotTime = new Date(slotTime.getTime() + 60 * 60 * 1000); // +1 hour

    return tasks.filter(task => {
      const taskStart = new Date(task.startTime);

      // Task appears only in the time slot where it starts
      return (
        taskStart >= slotTime &&
        taskStart < nextSlotTime &&
        taskStart.toDateString() === date.toDateString()
      );
    });
  };

  const getTasksWithReminders = (date: Date): Task[] => {
    return tasks.filter(task => {
      const taskDate = new Date(task.startTime);
      return task.reminder && taskDate.toDateString() === date.toDateString();
    });
  };

  const navigatePrevious = () => {
    if (viewMode === ViewMode.DAY) {
      setCurrentDate(addDays(currentDate, -1));
    } else {
      setCurrentDate(addWeeks(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (viewMode === ViewMode.DAY) {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddTask = () => {
    router.push('/task/create');
  };

  const handleTaskPress = (task: Task) => {
    router.push(`/task/${task.id}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };


  const renderDayView = () => {
    const todayTasks = getTasksForDate(currentDate);
    const reminderTasks = getTasksWithReminders(currentDate);

    return (
      <ScrollView style={styles.dayView}>
        {/* Reminders Section */}
        {reminderTasks.length > 0 && (
          <View style={styles.reminderSection}>
            <View style={styles.reminderHeader}>
              <Ionicons name="notifications" size={18} color="#F59E0B" />
              <Text style={styles.reminderTitle}>Nhắc nhở</Text>
            </View>
            {reminderTasks.map((task) => (
              <TouchableOpacity
                key={`reminder-${task.id}`}
                style={[
                  styles.reminderCard,
                  { borderLeftColor: TaskCategoryColors[task.category] }
                ]}
                onPress={() => handleTaskPress(task)}
              >
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTaskTitle}>{task.title}</Text>
                  <View style={styles.reminderTimeRow}>
                    <Text style={styles.reminderTime}>
                      Nhắc nhở: {formatTime(new Date(task.reminder!))}
                    </Text>
                    <Text style={styles.reminderOriginalTime}>
                      Công việc: {formatTime(new Date(task.startTime))} - {formatTime(new Date(task.endTime))}
                    </Text>
                  </View>
                  {task.description && (
                    <Text style={styles.reminderDescription}>{task.description}</Text>
                  )}
                </View>
                <View style={styles.reminderIconContainer}>
                  <Ionicons name="alarm-outline" size={16} color="#F59E0B" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Hourly Time slots */}
        {generateTimeSlots().map((timeSlot) => {
          const slotTasks = getTasksForTimeSlot(currentDate, timeSlot);

          return (
            <View key={timeSlot} style={styles.timeSlot}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{timeSlot}</Text>
              </View>
              <View style={styles.tasksColumn}>
                {slotTasks.length > 0 ? (
                  slotTasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        styles.taskCard,
                        { borderLeftColor: TaskCategoryColors[task.category] }
                      ]}
                      onPress={() => handleTaskPress(task)}
                    >
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <Text style={styles.taskTime}>
                        {formatTime(new Date(task.startTime))} - {formatTime(new Date(task.endTime))}
                      </Text>
                      <Text style={styles.taskDuration}>
                        {(() => {
                          const start = new Date(task.startTime);
                          const end = new Date(task.endTime);
                          const diffMs = end.getTime() - start.getTime();
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                          if (diffHours > 0 && diffMinutes > 0) {
                            return `${diffHours}h ${diffMinutes}m`;
                          } else if (diffHours > 0) {
                            return `${diffHours}h`;
                          } else {
                            return `${diffMinutes}m`;
                          }
                        })()}
                      </Text>
                      {task.description && (
                        <Text style={styles.taskDescription}>{task.description}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptySlotText}>Trống</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);

    return (
      <ScrollView style={styles.weekView}>
        <View style={styles.weekHeader}>
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayHeader,
                isToday(day) && styles.todayHeader
              ]}
              onPress={() => {
                setCurrentDate(day);
                setViewMode(ViewMode.DAY);
              }}
            >
              <Text style={[
                styles.dayHeaderText,
                isToday(day) && styles.todayHeaderText
              ]}>
                {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
              </Text>
              <Text style={[
                styles.dayHeaderDate,
                isToday(day) && styles.todayHeaderDate
              ]}>
                {day.getDate()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.weekContent}>
            {generateTimeSlots().map((timeSlot) => (
              <View key={timeSlot} style={styles.weekTimeRow}>
                <View style={styles.weekTimeColumn}>
                  <Text style={styles.weekTimeText}>{timeSlot}</Text>
                </View>
                {weekDays.map((day, dayIndex) => {
                  const dayTasks = getTasksForTimeSlot(day, timeSlot);
                  return (
                    <View key={dayIndex} style={styles.weekDayColumn}>
                      {dayTasks.map((task) => (
                        <TouchableOpacity
                          key={task.id}
                          style={[
                            styles.weekTaskCard,
                            { backgroundColor: TaskCategoryColors[task.category] + '20' }
                          ]}
                          onPress={() => handleTaskPress(task)}
                        >
                          <Text style={styles.weekTaskTitle} numberOfLines={1}>
                            {task.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Combined Header */}
      <View style={styles.combinedHeader}>
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>
              {userName ? `${userName}!` : 'Người dùng!'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.headerTitle}>Lịch trình</Text>
          <TouchableOpacity onPress={handleAddTask} style={styles.addButton}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={navigatePrevious} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.dateContainer}>
          <Text style={styles.monthText}>
            {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.dateText}>
            {viewMode === ViewMode.DAY
              ? currentDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric' })
              : `Tuần ${Math.ceil(currentDate.getDate() / 7)}`
            }
          </Text>
        </View>

        <TouchableOpacity onPress={navigateNext} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* View Controls */}
      <View style={styles.viewControls}>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === ViewMode.DAY && styles.activeToggleButton
            ]}
            onPress={() => setViewMode(ViewMode.DAY)}
          >
            <Text style={[
              styles.toggleButtonText,
              viewMode === ViewMode.DAY && styles.activeToggleButtonText
            ]}>
              Ngày
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === ViewMode.WEEK && styles.activeToggleButton
            ]}
            onPress={() => setViewMode(ViewMode.WEEK)}
          >
            <Text style={[
              styles.toggleButtonText,
              viewMode === ViewMode.WEEK && styles.activeToggleButtonText
            ]}>
              Tuần
            </Text>
          </TouchableOpacity>
        </View>

        {!isToday(currentDate) && (
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayButtonText}>Hôm nay</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {viewMode === ViewMode.DAY ? renderDayView() : renderWeekView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  combinedHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: -0.3,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  viewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 3,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9,
    minWidth: 60,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeToggleButtonText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  todayButtonText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  dayView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  timeSlot: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 4,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  timeColumn: {
    width: 70,
    paddingRight: 16,
    paddingTop: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tasksColumn: {
    flex: 1,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
    lineHeight: 22,
  },
  taskTime: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  taskDuration: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptySlot: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  emptySlotText: {
    fontSize: 12,
    color: '#E5E7EB',
    fontStyle: 'italic',
  },
  weekView: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingLeft: 80,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  todayHeader: {
    backgroundColor: '#3B82F6',
  },
  dayHeaderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  todayHeaderText: {
    color: '#FFFFFF',
  },
  dayHeaderDate: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  todayHeaderDate: {
    color: '#FFFFFF',
  },
  weekContent: {
    minWidth: '100%',
  },
  weekTimeRow: {
    flexDirection: 'row',
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  weekTimeColumn: {
    width: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  weekTimeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  weekDayColumn: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 60,
  },
  weekTaskCard: {
    padding: 6,
    borderRadius: 4,
    marginBottom: 2,
  },
  weekTaskTitle: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '500',
  },
  reminderSection: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  reminderCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  reminderTimeRow: {
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 2,
  },
  reminderOriginalTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  reminderDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 4,
  },
  reminderIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});