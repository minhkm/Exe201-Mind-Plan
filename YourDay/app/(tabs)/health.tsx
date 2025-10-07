import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Pedometer } from 'expo-sensors';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import CircularProgress from '@/components/CircularProgress';
import { HealthService } from '@/services/healthService';
import { BMIStatusColors, BMIStatusLabels, HealthData, StepData, WaterData, WeightData } from '@/types/health';
import { sanitizeNumericInput, validateBMI, validateHeight, validateSteps, validateWeight } from '@/utils/validation';

export default function HealthScreen() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userHeight, setUserHeight] = useState<number | undefined>();
  const [pedometerAvailable, setPedometerAvailable] = useState(false);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [showCongratulations, setShowCongratulations] = useState(false);

  // Modal states
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showHeightModal, setShowHeightModal] = useState(false);
  const [showBMIModal, setShowBMIModal] = useState(false);

  // Input states
  const [stepsInput, setStepsInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [bmiWeightInput, setBmiWeightInput] = useState('');
  const [bmiHeightInput, setBmiHeightInput] = useState('');

  // Validation states
  const [stepsError, setStepsError] = useState('');
  const [weightError, setWeightError] = useState('');
  const [heightError, setHeightError] = useState('');
  const [bmiWeightError, setBmiWeightError] = useState('');
  const [bmiHeightError, setBmiHeightError] = useState('');

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadHealthData();
      initializePedometer();
    }, [])
  );

  const initializePedometer = async () => {
    const isAvailable = await Pedometer.isAvailableAsync();
    setPedometerAvailable(isAvailable);

    if (isAvailable) {
      // Get today's steps from device
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();

      try {
        const result = await Pedometer.getStepCountAsync(start, end);
        if (result.steps > 0) {
          setCurrentSteps(result.steps);
          // Auto-update health data with device steps
          await HealthService.updateSteps(result.steps);
          loadHealthData();
        }
      } catch (error) {
        console.error('Error getting step count:', error);
      }

      // Subscribe to real-time step updates
      const subscription = Pedometer.watchStepCount(result => {
        setCurrentSteps(prev => prev + result.steps);
      });

      return () => subscription && subscription.remove();
    }
  };

  const loadHealthData = async () => {
    try {
      const [data, profile] = await Promise.all([
        HealthService.getTodayData(),
        HealthService.getUserProfile()
      ]);

      setHealthData(data);
      setUserHeight(profile.height);
    } catch (error) {
      console.error('Error loading health data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu sức khỏe');
    } finally {
      setLoading(false);
    }
  };

  const addWater = async (cups: number) => {
    try {
      const updatedData = await HealthService.addWater(cups);
      const waterData = HealthService.getWaterData(updatedData.waterIntake);

      // Check if goal reached
      if (waterData.current >= waterData.goal && !showCongratulations) {
        setShowCongratulations(true);
        setTimeout(() => setShowCongratulations(false), 3000);
      }

      setHealthData(updatedData);
    } catch (error) {
      console.error('Error adding water:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật lượng nước uống');
    }
  };

  const resetWater = async () => {
    Alert.alert(
      'Đặt lại lượng nước',
      'Bạn có chắc muốn đặt lại lượng nước uống hôm nay?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedData = await HealthService.resetWater();
              setHealthData(updatedData);
            } catch (error) {
              console.error('Error resetting water:', error);
              Alert.alert('Lỗi', 'Không thể đặt lại lượng nước uống');
            }
          }
        }
      ]
    );
  };

  const updateSteps = async () => {
    const validation = validateSteps(stepsInput);
    if (!validation.isValid) {
      setStepsError(validation.error || '');
      return;
    }

    try {
      const steps = parseInt(stepsInput);
      const updatedData = await HealthService.updateSteps(steps);
      setHealthData(updatedData);
      setShowStepsModal(false);
      setStepsInput('');
      setStepsError('');
    } catch (error) {
      console.error('Error updating steps:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật số bước');
    }
  };

  const updateWeight = async () => {
    const validation = validateWeight(weightInput);
    if (!validation.isValid) {
      setWeightError(validation.error || '');
      return;
    }

    try {
      const weight = parseFloat(weightInput);
      const updatedData = await HealthService.updateWeight(weight, userHeight);
      setHealthData(updatedData);
      setShowWeightModal(false);
      setWeightInput('');
      setWeightError('');
    } catch (error) {
      console.error('Error updating weight:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật cân nặng');
    }
  };

  const updateHeight = async () => {
    const validation = validateHeight(heightInput);
    if (!validation.isValid) {
      setHeightError(validation.error || '');
      return;
    }

    try {
      const height = parseFloat(heightInput);
      await HealthService.saveUserProfile({ height });
      setUserHeight(height);
      setShowHeightModal(false);
      setHeightInput('');
      setHeightError('');

      // Update health data if weight exists
      if (healthData?.weight) {
        const updatedData = await HealthService.updateWeight(healthData.weight, height);
        setHealthData(updatedData);
      }
    } catch (error) {
      console.error('Error updating height:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật chiều cao');
    }
  };

  const updateBMI = async () => {
    const validation = validateBMI(bmiWeightInput, bmiHeightInput);
    if (!validation.isValid) {
      // Check individual field errors
      const weightValidation = validateWeight(bmiWeightInput);
      const heightValidation = validateHeight(bmiHeightInput);

      setBmiWeightError(weightValidation.isValid ? '' : weightValidation.error || '');
      setBmiHeightError(heightValidation.isValid ? '' : heightValidation.error || '');

      // Show general error if both fields are valid but BMI is invalid
      if (weightValidation.isValid && heightValidation.isValid) {
        Alert.alert('Lỗi', validation.error || 'Thông tin không hợp lệ');
      }
      return;
    }

    try {
      const weight = parseFloat(bmiWeightInput);
      const height = parseFloat(bmiHeightInput);

      // Save both weight and height
      await HealthService.saveUserProfile({ height });
      setUserHeight(height);

      const updatedData = await HealthService.updateWeight(weight, height);
      setHealthData(updatedData);

      setShowBMIModal(false);
      setBmiWeightInput('');
      setBmiHeightInput('');
      setBmiWeightError('');
      setBmiHeightError('');

      Alert.alert('Thành công', 'Đã cập nhật thông tin BMI');
    } catch (error) {
      console.error('Error updating BMI:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin BMI');
    }
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

  if (!healthData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không thể tải dữ liệu sức khỏe</Text>
          <TouchableOpacity onPress={loadHealthData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stepData: StepData = HealthService.getStepData(healthData.steps);
  const waterData: WaterData = HealthService.getWaterData(healthData.waterIntake);
  const weightData: WeightData | null = userHeight && healthData.weight
    ? HealthService.getWeightData(healthData.weight, userHeight)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sức khỏe cá nhân</Text>
        <Text style={styles.headerDate}>Hôm nay, {new Date().toLocaleDateString('vi-VN')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Steps Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="footsteps" size={24} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Bước chân</Text>
              {pedometerAvailable && (
                <View style={styles.autoTag}>
                  <Text style={styles.autoTagText}>Auto</Text>
                </View>
              )}
            </View>
            {!pedometerAvailable && (
              <TouchableOpacity
                onPress={() => {
                  setStepsInput(healthData.steps.toString());
                  setStepsError('');
                  setShowStepsModal(true);
                }}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.stepsContainer}>
            <View style={styles.mainMetric}>
              <Text style={styles.mainMetricNumber}>{stepData.steps.toLocaleString()}</Text>
              <Text style={styles.mainMetricLabel}>bước</Text>
            </View>

            <View style={styles.subMetrics}>
              <View style={styles.subMetric}>
                <Ionicons name="flame" size={16} color="#EF4444" />
                <Text style={styles.subMetricValue}>{stepData.calories}</Text>
                <Text style={styles.subMetricLabel}>kcal</Text>
              </View>
              <View style={styles.subMetric}>
                <Ionicons name="location" size={16} color="#10B981" />
                <Text style={styles.subMetricValue}>{stepData.distance}</Text>
                <Text style={styles.subMetricLabel}>km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Water Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="water" size={24} color="#06B6D4" />
              <Text style={styles.sectionTitle}>Nước uống</Text>
            </View>
            <TouchableOpacity onPress={resetWater} style={styles.editButton}>
              <Ionicons name="refresh-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.waterContainer}>
            <CircularProgress
              size={120}
              strokeWidth={8}
              progress={waterData.percentage}
              color="#06B6D4"
              backgroundColor="#E2E8F0"
            >
              <View style={styles.waterProgressContent}>
                <Text style={styles.waterCurrent}>{waterData.current}</Text>
                <Text style={styles.waterGoal}>/ {waterData.goal} cốc</Text>
              </View>
            </CircularProgress>

            <View style={styles.waterButtons}>
              <TouchableOpacity onPress={() => addWater(1)} style={styles.waterButton}>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.waterButtonText}>Uống 1 cốc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Weight & BMI Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="fitness" size={24} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Cân nặng & BMI</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setBmiWeightInput(healthData.weight?.toString() || '');
                setBmiHeightInput(userHeight?.toString() || '');
                setBmiWeightError('');
                setBmiHeightError('');
                setShowBMIModal(true);
              }}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.weightContainer}>
            {!userHeight || !healthData.weight ? (
              <View style={styles.setupContainer}>
                <Ionicons name="fitness" size={48} color="#8B5CF6" />
                <Text style={styles.setupText}>Theo dõi chỉ số BMI của bạn</Text>
                <Text style={styles.setupSubtext}>
                  BMI giúp đánh giá tình trạng sức khỏe dựa trên chiều cao và cân nặng
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setBmiWeightInput(healthData.weight?.toString() || '');
                    setBmiHeightInput(userHeight?.toString() || '');
                    setBmiWeightError('');
                    setBmiHeightError('');
                    setShowBMIModal(true);
                  }}
                  style={styles.setupButton}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.setupButtonText}>Nhập thông tin</Text>
                </TouchableOpacity>
              </View>
            ) : weightData ? (
              <View style={styles.weightData}>
                <View style={styles.weightMetrics}>
                  <View style={styles.weightMetric}>
                    <Text style={styles.weightValue}>{weightData.weight}</Text>
                    <Text style={styles.weightLabel}>kg</Text>
                  </View>
                  <View style={styles.weightMetric}>
                    <Text style={styles.weightValue}>{userHeight}</Text>
                    <Text style={styles.weightLabel}>cm</Text>
                  </View>
                </View>

                <View style={styles.bmiContainer}>
                  <Text style={styles.bmiLabel}>Chỉ số BMI</Text>
                  <Text style={styles.bmiValue}>{weightData.bmi}</Text>
                  <View style={[
                    styles.bmiStatus,
                    { backgroundColor: BMIStatusColors[weightData.status] + '20' }
                  ]}>
                    <Text style={[
                      styles.bmiStatusText,
                      { color: BMIStatusColors[weightData.status] }
                    ]}>
                      {BMIStatusLabels[weightData.status]}
                    </Text>
                  </View>

                  <View style={styles.bmiRanges}>
                    <Text style={styles.bmiRangeTitle}>Phân loại BMI:</Text>
                    <View style={styles.bmiRangeItem}>
                      <View style={[styles.bmiRangeDot, { backgroundColor: '#3B82F6' }]} />
                      <Text style={styles.bmiRangeText}>Thiếu cân: &lt; 18.5</Text>
                    </View>
                    <View style={styles.bmiRangeItem}>
                      <View style={[styles.bmiRangeDot, { backgroundColor: '#10B981' }]} />
                      <Text style={styles.bmiRangeText}>Bình thường: 18.5 - 24.9</Text>
                    </View>
                    <View style={styles.bmiRangeItem}>
                      <View style={[styles.bmiRangeDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.bmiRangeText}>Thừa cân: 25 - 29.9</Text>
                    </View>
                    <View style={styles.bmiRangeItem}>
                      <View style={[styles.bmiRangeDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.bmiRangeText}>Béo phì: ≥ 30</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Steps Modal */}
      <Modal visible={showStepsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật số bước</Text>
              <TouchableOpacity onPress={() => {
                setShowStepsModal(false);
                setStepsError('');
              }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={[styles.modalInput, stepsError ? styles.inputError : null]}
                value={stepsInput}
                onChangeText={(text) => {
                  const sanitized = sanitizeNumericInput(text).replace(/\./g, '');
                  setStepsInput(sanitized);
                  if (stepsError) {
                    const validation = validateSteps(sanitized);
                    setStepsError(validation.isValid ? '' : validation.error || '');
                  }
                }}
                placeholder="Nhập số bước"
                keyboardType="numeric"
                autoFocus
              />
              {stepsError ? (
                <Text style={styles.errorText}>{stepsError}</Text>
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowStepsModal(false);
                    setStepsError('');
                  }}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={updateSteps}
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weight Modal */}
      <Modal visible={showWeightModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật cân nặng</Text>
              <TouchableOpacity onPress={() => {
                setShowWeightModal(false);
                setWeightError('');
              }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={[styles.modalInput, weightError ? styles.inputError : null]}
                value={weightInput}
                onChangeText={(text) => {
                  const sanitized = sanitizeNumericInput(text);
                  setWeightInput(sanitized);
                  if (weightError) {
                    const validation = validateWeight(sanitized);
                    setWeightError(validation.isValid ? '' : validation.error || '');
                  }
                }}
                placeholder="Nhập cân nặng (kg)"
                keyboardType="decimal-pad"
                autoFocus
              />
              {weightError ? (
                <Text style={styles.errorText}>{weightError}</Text>
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowWeightModal(false);
                    setWeightError('');
                  }}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={updateWeight}
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Height Modal */}
      <Modal visible={showHeightModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nhập chiều cao</Text>
              <TouchableOpacity onPress={() => {
                setShowHeightModal(false);
                setHeightError('');
              }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={[styles.modalInput, heightError ? styles.inputError : null]}
                value={heightInput}
                onChangeText={(text) => {
                  const sanitized = sanitizeNumericInput(text).replace(/\./g, '');
                  setHeightInput(sanitized);
                  if (heightError) {
                    const validation = validateHeight(sanitized);
                    setHeightError(validation.isValid ? '' : validation.error || '');
                  }
                }}
                placeholder="Nhập chiều cao (cm)"
                keyboardType="numeric"
                autoFocus
              />
              {heightError ? (
                <Text style={styles.errorText}>{heightError}</Text>
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowHeightModal(false);
                    setHeightError('');
                  }}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={updateHeight}
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* BMI Modal */}
      <Modal visible={showBMIModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.bmiModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin BMI</Text>
              <TouchableOpacity onPress={() => {
                setShowBMIModal(false);
                setBmiWeightError('');
                setBmiHeightError('');
              }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.bmiModalDescription}>
                Nhập cân nặng và chiều cao để tính chỉ số BMI
              </Text>

              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Cân nặng (kg)</Text>
                  <TextInput
                    style={[styles.modalInput, bmiWeightError ? styles.inputError : null]}
                    value={bmiWeightInput}
                    onChangeText={(text) => {
                      const sanitized = sanitizeNumericInput(text);
                      setBmiWeightInput(sanitized);
                      if (bmiWeightError) {
                        const validation = validateWeight(sanitized);
                        setBmiWeightError(validation.isValid ? '' : validation.error || '');
                      }
                    }}
                    placeholder="VD: 65"
                    keyboardType="decimal-pad"
                  />
                  {bmiWeightError ? (
                    <Text style={styles.errorText}>{bmiWeightError}</Text>
                  ) : null}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Chiều cao (cm)</Text>
                  <TextInput
                    style={[styles.modalInput, bmiHeightError ? styles.inputError : null]}
                    value={bmiHeightInput}
                    onChangeText={(text) => {
                      const sanitized = sanitizeNumericInput(text).replace(/\./g, '');
                      setBmiHeightInput(sanitized);
                      if (bmiHeightError) {
                        const validation = validateHeight(sanitized);
                        setBmiHeightError(validation.isValid ? '' : validation.error || '');
                      }
                    }}
                    placeholder="VD: 170"
                    keyboardType="numeric"
                  />
                  {bmiHeightError ? (
                    <Text style={styles.errorText}>{bmiHeightError}</Text>
                  ) : null}
                </View>
              </View>

              {bmiWeightInput && bmiHeightInput && (
                <View style={styles.bmiPreview}>
                  <Text style={styles.bmiPreviewLabel}>BMI dự kiến:</Text>
                  <Text style={styles.bmiPreviewValue}>
                    {(() => {
                      const validation = validateBMI(bmiWeightInput, bmiHeightInput);
                      if (validation.isValid) {
                        const weight = parseFloat(bmiWeightInput);
                        const height = parseFloat(bmiHeightInput);
                        const bmi = weight / Math.pow(height / 100, 2);
                        return bmi.toFixed(1);
                      }
                      return '--';
                    })()}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowBMIModal(false);
                    setBmiWeightError('');
                    setBmiHeightError('');
                  }}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={updateBMI}
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Congratulations Modal */}
      <Modal visible={showCongratulations} transparent animationType="fade">
        <View style={styles.congratulationsOverlay}>
          <Animated.View style={styles.congratulationsContainer}>
            <Ionicons name="trophy" size={64} color="#F59E0B" />
            <Text style={styles.congratulationsTitle}>🎉 Chúc mừng!</Text>
            <Text style={styles.congratulationsText}>
              Bạn đã hoàn thành mục tiêu uống nước hôm nay!
            </Text>
            <Text style={styles.congratulationsSubtext}>
              Tiếp tục duy trì thói quen tốt này nhé! 💧
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  autoTag: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#10B981',
    borderRadius: 10,
  },
  autoTagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },

  // Steps Section
  stepsContainer: {
    alignItems: 'center',
  },
  mainMetric: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainMetricNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#3B82F6',
  },
  mainMetricLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  subMetrics: {
    flexDirection: 'row',
    gap: 32,
  },
  subMetric: {
    alignItems: 'center',
  },
  subMetricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  subMetricLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  // Water Section
  waterContainer: {
    alignItems: 'center',
  },
  waterProgressContent: {
    alignItems: 'center',
  },
  waterCurrent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06B6D4',
  },
  waterGoal: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  waterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  waterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#06B6D4',
    borderRadius: 25,
    gap: 8,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  waterButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // Weight Section
  weightContainer: {
    alignItems: 'center',
  },
  weightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  heightButtonText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
    marginLeft: 4,
  },
  setupContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  setupText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500',
  },
  setupSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  weightData: {
    width: '100%',
    alignItems: 'center',
  },
  weightMetrics: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 20,
  },
  weightMetric: {
    alignItems: 'center',
  },
  weightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  weightLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  bmiContainer: {
    alignItems: 'center',
  },
  bmiLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 8,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  bmiStatus: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bmiStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bmiRanges: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  bmiRangeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  bmiRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bmiRangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  bmiRangeText: {
    fontSize: 12,
    color: '#64748B',
  },

  // Loading & Error
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
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalContent: {
    padding: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // BMI Modal
  bmiModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    minWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  bmiModalDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  bmiPreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bmiPreviewLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  bmiPreviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },

  // Congratulations Modal
  congratulationsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratulationsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  congratulationsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 12,
  },
  congratulationsText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  congratulationsSubtext: {
    fontSize: 14,
    color: '#06B6D4',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Validation styles
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: -16,
    marginBottom: 16,
    marginLeft: 4,
  },
});