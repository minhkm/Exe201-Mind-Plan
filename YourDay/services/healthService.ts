import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthData, StepData, WaterData, WeightData, calculateBMI, getBMIStatus, calculateCalories, calculateDistance } from '@/types/health';

const HEALTH_DATA_KEY = 'health_data';
const WATER_GOAL = 8; // cups

export class HealthService {
  // Get today's health data
  static async getTodayData(): Promise<HealthData> {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(`${HEALTH_DATA_KEY}_${today}`);

      if (stored) {
        const data = JSON.parse(stored);
        return {
          ...data,
          date: new Date(data.date)
        };
      }

      // Default data for today
      return {
        steps: 0,
        waterIntake: 0,
        date: new Date(),
      };
    } catch (error) {
      console.error('Error loading health data:', error);
      return {
        steps: 0,
        waterIntake: 0,
        date: new Date(),
      };
    }
  }

  // Save today's health data
  static async saveTodayData(data: HealthData): Promise<void> {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(`${HEALTH_DATA_KEY}_${today}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving health data:', error);
      throw error;
    }
  }

  // Update steps
  static async updateSteps(steps: number): Promise<HealthData> {
    const data = await this.getTodayData();
    data.steps = steps;
    await this.saveTodayData(data);
    return data;
  }

  // Add water intake (in cups)
  static async addWater(cups: number): Promise<HealthData> {
    const data = await this.getTodayData();
    data.waterIntake = Math.min(data.waterIntake + cups, WATER_GOAL * 2); // Cap at 2x goal
    await this.saveTodayData(data);
    return data;
  }

  // Reset water intake
  static async resetWater(): Promise<HealthData> {
    const data = await this.getTodayData();
    data.waterIntake = 0;
    await this.saveTodayData(data);
    return data;
  }

  // Update weight and height
  static async updateWeight(weight: number, height?: number): Promise<HealthData> {
    const data = await this.getTodayData();
    data.weight = weight;
    if (height) {
      data.height = height;
    }
    await this.saveTodayData(data);
    return data;
  }

  // Get step data with calculations
  static getStepData(steps: number): StepData {
    return {
      steps,
      calories: calculateCalories(steps),
      distance: calculateDistance(steps),
    };
  }

  // Get water data with progress
  static getWaterData(waterIntake: number): WaterData {
    return {
      current: waterIntake,
      goal: WATER_GOAL,
      percentage: Math.min((waterIntake / WATER_GOAL) * 100, 100),
    };
  }

  // Get weight data with BMI
  static getWeightData(weight: number, height: number): WeightData | null {
    if (!weight || !height) return null;

    const bmi = calculateBMI(weight, height);
    const status = getBMIStatus(bmi);

    return {
      weight,
      height,
      bmi,
      status,
    };
  }

  // Get user profile (height for BMI calculation)
  static async getUserProfile(): Promise<{ height?: number }> {
    try {
      const stored = await AsyncStorage.getItem('user_profile');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading user profile:', error);
      return {};
    }
  }

  // Save user profile
  static async saveUserProfile(profile: { height?: number }): Promise<void> {
    try {
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }
}