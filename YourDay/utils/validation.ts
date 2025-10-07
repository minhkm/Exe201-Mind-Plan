export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Weight validation (in kg)
export const validateWeight = (weight: string | number): ValidationResult => {
  const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;

  // Check if it's a valid number
  if (isNaN(numWeight)) {
    return { isValid: false, error: 'Vui lòng nhập số hợp lệ' };
  }

  // Check minimum weight
  if (numWeight <= 0) {
    return { isValid: false, error: 'Cân nặng phải lớn hơn 0kg' };
  }

  // Check maximum weight (reasonable limit)
  if (numWeight > 500) {
    return { isValid: false, error: 'Cân nặng không được vượt quá 500kg' };
  }

  // Check for too many decimal places
  const weightStr = numWeight.toString();
  if (weightStr.includes('.') && weightStr.split('.')[1].length > 1) {
    return { isValid: false, error: 'Cân nặng chỉ được có tối đa 1 chữ số thập phân' };
  }

  // Check realistic range for humans
  if (numWeight < 10) {
    return { isValid: false, error: 'Cân nặng quá thấp (tối thiểu 10kg)' };
  }

  if (numWeight > 300) {
    return { isValid: false, error: 'Cân nặng vượt quá giới hạn thực tế (tối đa 300kg)' };
  }

  return { isValid: true };
};

// Height validation (in cm)
export const validateHeight = (height: string | number): ValidationResult => {
  const numHeight = typeof height === 'string' ? parseFloat(height) : height;

  // Check if it's a valid number
  if (isNaN(numHeight)) {
    return { isValid: false, error: 'Vui lòng nhập số hợp lệ' };
  }

  // Check minimum height
  if (numHeight <= 0) {
    return { isValid: false, error: 'Chiều cao phải lớn hơn 0cm' };
  }

  // Check maximum height (reasonable limit)
  if (numHeight > 300) {
    return { isValid: false, error: 'Chiều cao không được vượt quá 300cm' };
  }

  // Check for decimal places (height usually in whole numbers)
  if (numHeight % 1 !== 0) {
    return { isValid: false, error: 'Chiều cao chỉ được nhập số nguyên (cm)' };
  }

  // Check realistic range for humans
  if (numHeight < 50) {
    return { isValid: false, error: 'Chiều cao quá thấp (tối thiểu 50cm)' };
  }

  if (numHeight > 250) {
    return { isValid: false, error: 'Chiều cao vượt quá giới hạn thực tế (tối đa 250cm)' };
  }

  return { isValid: true };
};

// Combined BMI validation
export const validateBMI = (weight: string | number, height: string | number): ValidationResult => {
  const weightValidation = validateWeight(weight);
  if (!weightValidation.isValid) {
    return weightValidation;
  }

  const heightValidation = validateHeight(height);
  if (!heightValidation.isValid) {
    return heightValidation;
  }

  const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
  const numHeight = typeof height === 'string' ? parseFloat(height) : height;

  // Calculate BMI to check if it's in reasonable range
  const heightInMeters = numHeight / 100;
  const bmi = numWeight / (heightInMeters * heightInMeters);

  // Check for extremely unusual BMI values
  if (bmi < 10) {
    return { isValid: false, error: 'Tỷ lệ cân nặng/chiều cao quá thấp, vui lòng kiểm tra lại' };
  }

  if (bmi > 100) {
    return { isValid: false, error: 'Tỷ lệ cân nặng/chiều cao quá cao, vui lòng kiểm tra lại' };
  }

  return { isValid: true };
};

// Steps validation
export const validateSteps = (steps: string | number): ValidationResult => {
  const numSteps = typeof steps === 'string' ? parseInt(steps) : steps;

  // Check if it's a valid number
  if (isNaN(numSteps)) {
    return { isValid: false, error: 'Vui lòng nhập số hợp lệ' };
  }

  // Check minimum steps
  if (numSteps < 0) {
    return { isValid: false, error: 'Số bước không được âm' };
  }

  // Check maximum steps (realistic daily limit)
  if (numSteps > 100000) {
    return { isValid: false, error: 'Số bước quá cao (tối đa 100,000 bước/ngày)' };
  }

  // Check for decimal places
  if (numSteps % 1 !== 0) {
    return { isValid: false, error: 'Số bước phải là số nguyên' };
  }

  return { isValid: true };
};

// Sanitize input - remove unwanted characters
export const sanitizeNumericInput = (input: string): string => {
  // Remove all characters except digits, dots, and commas
  return input.replace(/[^0-9.,]/g, '')
              .replace(/,/g, '.') // Convert comma to dot for decimal
              .replace(/\.{2,}/g, '.') // Remove multiple dots
              .replace(/^\./, '0.'); // Add leading zero for decimals starting with dot
};