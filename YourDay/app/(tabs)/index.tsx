import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GreetingHeader } from '@/components/ui/greeting-header';
import { TaskService } from '@/services/taskService';
import { Task, TaskCategoryColors } from '@/types/task';
import { formatTime } from '@/utils/dateUtils';
import { getUser } from '@/utils/tokenStorage';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  // Reload tasks when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, [])
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

      // Get today's tasks
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const todayTasksData = await TaskService.getTasks({
        startDate: todayStart,
        endDate: todayEnd,
      });

      // Get upcoming tasks (next 30 days excluding today)
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(today.getDate() + 30);

      const upcomingTasksData = await TaskService.getTasks({
        startDate: tomorrow,
        endDate: thirtyDaysLater,
      });

      setTodayTasks(todayTasksData);
      setUpcomingTasks(upcomingTasksData.slice(0, 3)); // Show only first 3 upcoming tasks
    } catch (error) {
      console.error('Load tasks error:', error);
      // If API fails, show empty arrays instead of mock data
      setTodayTasks([]);
      setUpcomingTasks([]);
    } finally {
      setLoading(false);
    }
  };


  const handleViewCalendar = () => {
    router.push('/(tabs)/calendar');
  };

  const handleAddTask = () => {
    router.push('/task/create');
  };

  const handleTaskPress = (task: Task) => {
    router.push(`/task/${task.id}`);
  };

  const getDateBadge = (taskDate: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const taskStart = new Date(taskDate);
    taskStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);

    const diffTime = taskStart.getTime() - todayStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Ngày mai';
    } else if (diffDays <= 7) {
      return `${diffDays} ngày nữa`;
    } else if (diffDays <= 30) {
      const weeks = Math.ceil(diffDays / 7);
      return `${weeks} tuần nữa`;
    } else if (diffDays <= 365) {
      const months = Math.ceil(diffDays / 30);
      return `${months} tháng nữa`;
    } else {
      const years = Math.ceil(diffDays / 365);
      return `${years} năm nữa`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Greeting Header */}
      <GreetingHeader userName={userName} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todayTasks.length}</Text>
            <Text style={styles.statLabel}>Công việc hôm nay</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{upcomingTasks.length}</Text>
            <Text style={styles.statLabel}>Sắp tới</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddTask}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="add" size={20} color="#6366F1" />
            </View>
            <Text style={styles.actionText}>Thêm công việc</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleViewCalendar}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6366F1" />
            </View>
            <Text style={styles.actionText}>Xem lịch</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hôm nay</Text>
            <TouchableOpacity onPress={handleViewCalendar}>
              <Text style={styles.sectionAction}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {todayTasks.length > 0 ? (
            todayTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => handleTaskPress(task)}
              >
                <View style={styles.taskLeft}>
                  <View
                    style={[
                      styles.taskDot,
                      { backgroundColor: TaskCategoryColors[task.category] }
                    ]}
                  />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskTime}>
                      {formatTime(task.startTime)} - {formatTime(task.endTime)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có công việc nào hôm nay</Text>
              <TouchableOpacity style={styles.addTaskButton} onPress={handleAddTask}>
                <Text style={styles.addTaskText}>Thêm công việc</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upcoming Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sắp tới</Text>
            <TouchableOpacity onPress={handleViewCalendar}>
              <Text style={styles.sectionAction}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {upcomingTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => handleTaskPress(task)}
            >
              <View style={styles.taskLeft}>
                <View
                  style={[
                    styles.taskDot,
                    { backgroundColor: TaskCategoryColors[task.category] }
                  ]}
                />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={styles.taskBottomRow}>
                    <Text style={styles.taskTime}>
                      {formatTime(task.startTime)} - {formatTime(task.endTime)}
                    </Text>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>{getDateBadge(task.startTime)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionAction: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  taskCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  taskBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
    letterSpacing: 0.3,
  },
  taskTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  addTaskButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    borderRadius: 12,
  },
  addTaskText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
