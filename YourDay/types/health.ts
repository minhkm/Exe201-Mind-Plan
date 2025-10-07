export interface HealthData {
  steps: number;
  waterIntake: number; // in cups
  weight?: number; // in kg
  height?: number; // in cm
  date: Date;
}

export interface StepData {
  steps: number;
  calories: number;
  distance: number; // in km
}

export interface WaterData {
  current: number; // cups
  goal: number; // cups (default 8)
  percentage: number;
}

export interface WeightData {
  weight: number; // kg
  height: number; // cm
  bmi: number;
  status: BMIStatus;
}

export enum BMIStatus {
  UNDERWEIGHT = 'underweight',
  NORMAL = 'normal',
  OVERWEIGHT = 'overweight',
  OBESE = 'obese'
}

export const BMIStatusLabels: Record<BMIStatus, string> = {
  [BMIStatus.UNDERWEIGHT]: 'Thiếu cân',
  [BMIStatus.NORMAL]: 'Bình thường',
  [BMIStatus.OVERWEIGHT]: 'Thừa cân',
  [BMIStatus.OBESE]: 'Béo phì'
};

export const BMIStatusColors: Record<BMIStatus, string> = {
  [BMIStatus.UNDERWEIGHT]: '#3B82F6', // Blue
  [BMIStatus.NORMAL]: '#10B981', // Green
  [BMIStatus.OVERWEIGHT]: '#F59E0B', // Orange
  [BMIStatus.OBESE]: '#EF4444', // Red
};

// Health calculation utilities
export const calculateBMI = (weight: number, height: number): number => {
  if (!weight || !height || weight <= 0 || height <= 0) {
    return 0;
  }
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return Number(bmi.toFixed(1));
};

export const getBMIStatus = (bmi: number): BMIStatus => {
  if (bmi < 18.5) return BMIStatus.UNDERWEIGHT;
  if (bmi < 25) return BMIStatus.NORMAL;
  if (bmi < 30) return BMIStatus.OVERWEIGHT;
  return BMIStatus.OBESE;
};

export const calculateCalories = (steps: number): number => {
  // Average: 1 step = 0.04 calories
  return Math.round(steps * 0.04);
};

export const calculateDistance = (steps: number): number => {
  // Average: 1300 steps = 1 km
  return Number((steps / 1300).toFixed(2));
};