import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { TaskService } from '@/services/taskService';
import { Task, UpdateTaskRequest, TaskCategory, TaskCategoryColors, TaskCategoryLabels } from '@/types/task';
import { formatDate, formatTime } from '@/utils/dateUtils';

// Hide default header
export const options = {
  headerShown: false,
};

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<TaskCategory>(TaskCategory.OTHER);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date | undefined>();
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    try {
      const taskData = await TaskService.getTask(id!);
      setTask(taskData);

      // Populate form fields with task data
      setTitle(taskData.title);
      setDescription(taskData.description || '');
      setNotes(taskData.notes || '');
      setCategory(taskData.category);
      setStartTime(new Date(taskData.startTime));
      setEndTime(new Date(taskData.endTime));
      setReminderTime(taskData.reminder ? new Date(taskData.reminder) : undefined);
    } catch (error) {
      console.error('Load task error:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin công việc');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate title
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sự kiện');
      return;
    }

    // Validate times
    if (!startTime || !endTime) {
      Alert.alert('Lỗi', 'Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    if (endTime <= startTime) {
      Alert.alert('Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const taskData: UpdateTaskRequest = {
      id: id!,
      title: title.trim(),
      description: description.trim() || undefined,
      startTime,
      endTime,
      category,
      notes: notes.trim() || undefined,
      reminder: reminderTime,
    };

    try {
      await TaskService.updateTask(taskData);
      Alert.alert('Thành công', 'Đã cập nhật lịch trình', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Update task error:', error);

      // Handle specific error cases with user-friendly messages
      let errorTitle = 'Lỗi';
      let errorMessage = 'Không thể cập nhật lịch trình';

      if (error.message.includes('overlaps with existing task')) {
        errorTitle = 'Trùng lịch';
        if (error.conflictingTask) {
          const conflict = error.conflictingTask;
          const startTime = formatTime(conflict.startTime);
          const endTime = formatTime(conflict.endTime);
          errorMessage = `Thời gian này trùng với lịch trình:\n"${conflict.title}"\n(${startTime} - ${endTime})\n\nVui lòng chọn thời gian khác.`;
        } else {
          errorMessage = 'Thời gian này đã có lịch trình khác. Vui lòng chọn thời gian khác hoặc chỉnh sửa lịch hiện tại.';
        }
      } else if (error.message.includes('required')) {
        errorTitle = 'Thiếu thông tin';
        errorMessage = 'Vui lòng điền đầy đủ thông tin bắt buộc (tên sự kiện, thời gian bắt đầu, thời gian kết thúc).';
      } else if (error.message.includes('Invalid date')) {
        errorTitle = 'Thời gian không hợp lệ';
        errorMessage = 'Vui lòng kiểm tra lại thời gian bắt đầu và kết thúc.';
      } else if (error.message.includes('End time must be after start time')) {
        errorTitle = 'Thời gian không hợp lệ';
        errorMessage = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
      } else {
        errorMessage = `Đã xảy ra lỗi: ${error.message}`;
      }

      Alert.alert(errorTitle, errorMessage, [
        { text: 'OK', style: 'default' }
      ]);
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }

    if (selectedTime) {
      if (Platform.OS === 'ios') {
        setTempDate(selectedTime);
      } else {
        setStartTime(selectedTime);
        // Auto-adjust end time to be 1 hour after start time if end time is before new start time
        if (selectedTime >= endTime) {
          const newEndTime = new Date(selectedTime.getTime() + 60 * 60 * 1000);
          setEndTime(newEndTime);
        }
      }
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }

    if (selectedTime) {
      if (Platform.OS === 'ios') {
        setTempDate(selectedTime);
      } else {
        setEndTime(selectedTime);
      }
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }

    if (selectedDate) {
      if (Platform.OS === 'ios') {
        setTempDate(selectedDate);
      } else {
        const newStartTime = new Date(selectedDate);
        newStartTime.setHours(startTime.getHours(), startTime.getMinutes());
        setStartTime(newStartTime);

        const newEndTime = new Date(selectedDate);
        newEndTime.setHours(endTime.getHours(), endTime.getMinutes());
        setEndTime(newEndTime);
      }
    }
  };

  const onReminderTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowReminderPicker(false);
    }

    if (selectedTime) {
      if (Platform.OS === 'ios') {
        setTempDate(selectedTime);
      } else {
        setReminderTime(selectedTime);
      }
    }
  };

  const handleDatePickerDone = (type: 'startDate' | 'startTime' | 'endTime' | 'reminder') => {
    const dateToUse = tempDate || (type === 'startDate' || type === 'startTime' ? startTime :
                                   type === 'endTime' ? endTime :
                                   reminderTime || new Date());

    switch (type) {
      case 'startDate':
        const newStartTime = new Date(dateToUse);
        newStartTime.setHours(startTime.getHours(), startTime.getMinutes());
        setStartTime(newStartTime);

        const newEndTime = new Date(dateToUse);
        newEndTime.setHours(endTime.getHours(), endTime.getMinutes());
        setEndTime(newEndTime);
        break;
      case 'startTime':
        setStartTime(dateToUse);
        // Auto-adjust end time if needed
        if (dateToUse >= endTime) {
          const adjustedEndTime = new Date(dateToUse.getTime() + 60 * 60 * 1000);
          setEndTime(adjustedEndTime);
        }
        break;
      case 'endTime':
        setEndTime(dateToUse);
        break;
      case 'reminder':
        setReminderTime(dateToUse);
        break;
    }

    // Reset temp date and close modals
    setTempDate(null);
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setShowReminderPicker(false);
  };

  const handleNotesInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const reminderOptions = [
    { label: 'Đúng giờ', value: 0 },
    { label: '5 phút trước', value: 5 },
    { label: '10 phút trước', value: 10 },
    { label: '15 phút trước', value: 15 },
    { label: '30 phút trước', value: 30 },
    { label: '1 giờ trước', value: 60 },
    { label: 'Tùy chỉnh', value: -1 },
  ];

  const handleReminderOptionSelect = (value: number) => {
    setShowReminderOptions(false);

    if (value === -1) {
      setTimeout(() => {
        setShowReminderPicker(true);
      }, 200);
    } else {
      const reminder = new Date(startTime.getTime() - value * 60 * 1000);
      setReminderTime(reminder);
    }
  };

  const handleReminderButtonPress = () => {
    setShowReminderOptions(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getReminderLabel = () => {
    if (!reminderTime) return 'Chọn thời gian nhắc nhở';

    const diffMs = startTime.getTime() - reminderTime.getTime();
    const diffMin = Math.round(diffMs / (1000 * 60));

    if (diffMin === 0) return 'Đúng giờ';
    if (diffMin === 5) return '5 phút trước';
    if (diffMin === 10) return '10 phút trước';
    if (diffMin === 15) return '15 phút trước';
    if (diffMin === 30) return '30 phút trước';
    if (diffMin === 60) return '1 giờ trước';

    return `${formatTime(reminderTime)} (tùy chỉnh)`;
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={[styles.section, styles.firstSection]}>
            <Text style={styles.label}>Tên sự kiện *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="VD: Ăn sáng, Họp team, Thi cuối kỳ..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả ngắn về sự kiện"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Ngày</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => {
                setTempDate(startTime);
                setShowStartDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
              <Text style={styles.dateTimeText}>{formatDate(startTime)}</Text>
            </TouchableOpacity>
          </View>

          {/* Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Thời gian</Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[styles.dateTimeButton, styles.timeButton]}
                onPress={() => {
                  setTempDate(startTime);
                  setShowStartTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={20} color="#64748B" />
                <Text style={styles.dateTimeText}>{formatTime(startTime)}</Text>
              </TouchableOpacity>

              <Text style={styles.timeSeparator}>đến</Text>

              <TouchableOpacity
                style={[styles.dateTimeButton, styles.timeButton]}
                onPress={() => {
                  setTempDate(endTime);
                  setShowEndTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={20} color="#64748B" />
                <Text style={styles.dateTimeText}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Danh mục</Text>
            <View style={styles.categoryGrid}>
              {Object.values(TaskCategory).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    { borderColor: TaskCategoryColors[cat] },
                    category === cat && {
                      backgroundColor: TaskCategoryColors[cat] + '20',
                      borderWidth: 2,
                    }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: TaskCategoryColors[cat] }
                    ]}
                  />
                  <Text style={[
                    styles.categoryText,
                    category === cat && { color: TaskCategoryColors[cat], fontWeight: '600' }
                  ]}>
                    {TaskCategoryLabels[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reminder */}
          <View style={styles.section}>
            <Text style={styles.label}>Nhắc nhở</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={handleReminderButtonPress}
            >
              <Ionicons name="notifications-outline" size={20} color="#64748B" />
              <Text style={styles.dateTimeText}>
                {getReminderLabel()}
              </Text>
            </TouchableOpacity>
            {reminderTime && (
              <TouchableOpacity
                style={styles.clearReminderButton}
                onPress={() => setReminderTime(undefined)}
              >
                <Text style={styles.clearReminderText}>Xóa nhắc nhở</Text>
              </TouchableOpacity>
            )}

            {/* Reminder Options Modal */}
            {showReminderOptions && (
              <View style={styles.reminderOptionsModal}>
                {reminderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.reminderOption}
                    onPress={() => handleReminderOptionSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reminderOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.reminderOption, styles.cancelOption]}
                  onPress={() => setShowReminderOptions(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.reminderOptionText, styles.cancelText]}>Hủy</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Thêm ghi chú cho sự kiện này..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              onFocus={handleNotesInputFocus}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date/Time Pickers in Modals */}
      {showStartDatePicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn ngày</Text>
                <TouchableOpacity onPress={() => handleDatePickerDone('startDate')}>
                  <Text style={styles.pickerDoneButton}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || startTime}
                mode="date"
                display="spinner"
                onChange={onStartDateChange}
                textColor="#1E293B"
              />
            </View>
          </View>
        </Modal>
      )}

      {showStartTimePicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn giờ bắt đầu</Text>
                <TouchableOpacity onPress={() => handleDatePickerDone('startTime')}>
                  <Text style={styles.pickerDoneButton}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || startTime}
                mode="time"
                display="spinner"
                onChange={onStartTimeChange}
                textColor="#1E293B"
              />
            </View>
          </View>
        </Modal>
      )}

      {showEndTimePicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn giờ kết thúc</Text>
                <TouchableOpacity onPress={() => handleDatePickerDone('endTime')}>
                  <Text style={styles.pickerDoneButton}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || endTime}
                mode="time"
                display="spinner"
                onChange={onEndTimeChange}
                textColor="#1E293B"
              />
            </View>
          </View>
        </Modal>
      )}

      {showReminderPicker && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn giờ nhắc nhở</Text>
                <TouchableOpacity onPress={() => handleDatePickerDone('reminder')}>
                  <Text style={styles.pickerDoneButton}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate || reminderTime || new Date()}
                mode="time"
                display="spinner"
                onChange={onReminderTimeChange}
                textColor="#1E293B"
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
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
  section: {
    marginTop: 24,
    position: 'relative',
  },
  firstSection: {
    marginTop: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  notesInput: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    flex: 1,
  },
  timeSeparator: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#374151',
  },
  clearReminderButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearReminderText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  reminderOptionsModal: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    zIndex: 1000,
  },
  reminderOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    minHeight: 50,
    justifyContent: 'center',
  },
  reminderOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  cancelOption: {
    borderBottomWidth: 0,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  cancelText: {
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  pickerDoneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
});