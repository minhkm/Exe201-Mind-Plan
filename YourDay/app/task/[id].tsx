import React, { useState, useEffect, useCallback } from 'react';
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
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';

import { Task, TaskCategory, TaskCategoryLabels, TaskCategoryColors } from '@/types/task';
import { formatDate, formatTime, formatDateTime } from '@/utils/dateUtils';
import { TaskService } from '@/services/taskService';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    loadTask();
  }, [id]);

  // Reload task when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      if (id && task && !isDeleted) {
        // Don't show loading indicator when refreshing after edit
        loadTask(false);
      }
    }, [id, task, isDeleted])
  );

  const loadTask = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const taskData = await TaskService.getTask(id!);
      setTask(taskData);
    } catch (error) {
      console.error('Load task error:', error);

      // Check if task was deleted (404 error) or other error
      if (error.message.includes('404') || error.message.includes('not found') || isDeleted) {
        // Task was deleted, silently go back without showing error
        router.back();
      } else {
        // Other errors, show alert
        Alert.alert('Lỗi', 'Không thể tải thông tin công việc');
        router.back();
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleEdit = () => {
    router.push(`/task/edit/${id}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa công việc',
      'Bạn có chắc chắn muốn xóa công việc này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleted(true); // Mark as deleted to prevent reload
              await TaskService.deleteTask(id!);
              Alert.alert('Thành công', 'Đã xóa công việc', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Delete task error:', error);
              setIsDeleted(false); // Reset if delete failed
              Alert.alert('Lỗi', 'Không thể xóa công việc');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không tìm thấy công việc</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backToCalendarButton}>
            <Text style={styles.backToCalendarText}>Quay lại lịch</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết công việc</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
            <Ionicons name="create-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Section with Category Badge */}
        <View style={styles.titleSection}>
          <View style={styles.titleHeader}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={[
              styles.categoryBadge,
              { backgroundColor: TaskCategoryColors[task.category] + '20' }
            ]}>
              <View style={[
                styles.categoryDot,
                { backgroundColor: TaskCategoryColors[task.category] }
              ]} />
              <Text style={[
                styles.categoryBadgeText,
                { color: TaskCategoryColors[task.category] }
              ]}>
                {TaskCategoryLabels[task.category]}
              </Text>
            </View>
          </View>
          {task.description && (
            <Text style={styles.taskDescription}>{task.description}</Text>
          )}
        </View>

        {/* Time & Duration Card */}
        <View style={styles.timeCard}>
          <View style={styles.timeCardHeader}>
            <View style={styles.timeIconContainer}>
              <Ionicons name="time" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.timeCardTitle}>Thời gian</Text>
          </View>

          <View style={styles.timeDetails}>
            <View style={styles.timeRow}>
              <Ionicons name="play-circle" size={16} color="#10B981" />
              <Text style={styles.timeLabel}>Bắt đầu</Text>
              <Text style={styles.timeValue}>
                {formatTime(new Date(task.startTime))}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <Ionicons name="stop-circle" size={16} color="#EF4444" />
              <Text style={styles.timeLabel}>Kết thúc</Text>
              <Text style={styles.timeValue}>
                {formatTime(new Date(task.endTime))}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <Ionicons name="calendar" size={16} color="#6B7280" />
              <Text style={styles.timeLabel}>Ngày</Text>
              <Text style={styles.timeValue}>
                {formatDate(new Date(task.startTime))}
              </Text>
            </View>

            <View style={styles.durationInfo}>
              <View style={styles.durationBadge}>
                <Ionicons name="hourglass" size={14} color="#8B5CF6" />
                <Text style={styles.durationText}>
                  {(() => {
                    const start = new Date(task.startTime);
                    const end = new Date(task.endTime);
                    const diffMs = end.getTime() - start.getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                    if (diffHours > 0 && diffMinutes > 0) {
                      return `${diffHours} giờ ${diffMinutes} phút`;
                    } else if (diffHours > 0) {
                      return `${diffHours} giờ`;
                    } else {
                      return `${diffMinutes} phút`;
                    }
                  })()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reminder Section */}
        {task.reminder && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderIconContainer}>
                <Ionicons name="notifications" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.reminderTitle}>Nhắc nhở</Text>
            </View>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTime}>
                {formatTime(new Date(task.reminder))}
              </Text>
              <Text style={styles.reminderDate}>
                {formatDate(new Date(task.reminder))}
              </Text>
            </View>
          </View>
        )}

        {/* Notes Section */}
        {task.notes && (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text" size={20} color="#6B7280" />
              <Text style={styles.notesTitle}>Ghi chú</Text>
            </View>
            <View style={styles.notesContent}>
              <Text style={styles.notesText}>{task.notes}</Text>
            </View>
          </View>
        )}

        {/* Created/Updated Info */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Ionicons name="add-circle" size={16} color="#10B981" />
            <Text style={styles.metaLabel}>Được tạo</Text>
            <Text style={styles.metaValue}>
              {formatDateTime(new Date(task.createdAt))}
            </Text>
          </View>
          {task.updatedAt !== task.createdAt && (
            <View style={styles.metaRow}>
              <Ionicons name="create" size={16} color="#F59E0B" />
              <Text style={styles.metaLabel}>Cập nhật</Text>
              <Text style={styles.metaValue}>
                {formatDateTime(new Date(task.updatedAt))}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  backToCalendarButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  backToCalendarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  titleSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  titleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 12,
    lineHeight: 34,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    fontWeight: '400',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timeDetails: {
    flex: 1,
  },
  timeMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  timeDateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    marginRight: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIconContainer: {
    marginRight: 12,
  },
  reminderText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  notesText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },

  // New styles for improved UI
  timeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  timeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  durationInfo: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
    marginLeft: 6,
  },

  reminderCard: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  reminderContent: {
    paddingLeft: 28,
  },
  reminderTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },

  notesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  notesContent: {
    paddingLeft: 28,
  },

  metaCard: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
});