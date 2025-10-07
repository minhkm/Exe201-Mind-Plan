const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Otp = sequelize.define('Otp', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  code: {
    type: DataTypes.STRING(6),
    allowNull: false,
    validate: {
      len: [6, 6], // Exactly 6 digits
      isNumeric: true,
    },
  },
  type: {
    type: DataTypes.ENUM('password_reset'),
    allowNull: false,
    defaultValue: 'password_reset',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'otps',
  indexes: [
    {
      fields: ['email', 'type'],
    },
    {
      fields: ['code'],
    },
    {
      fields: ['expiresAt'],
    },
  ],
});

// Generate a random 6-digit OTP
Otp.generateCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create a new OTP for password reset
Otp.createPasswordResetOtp = async function(email) {
  const code = this.generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Deactivate any existing OTPs for this email
  await this.update(
    { isUsed: true },
    {
      where: {
        email,
        type: 'password_reset',
        isUsed: false
      }
    }
  );

  // Create new OTP
  const otp = await this.create({
    email,
    code,
    type: 'password_reset',
    expiresAt,
  });

  return otp;
};

// Verify OTP code
Otp.verifyCode = async function(email, code, type = 'password_reset') {
  const otp = await this.findOne({
    where: {
      email,
      code,
      type,
      isUsed: false,
      expiresAt: {
        [sequelize.Sequelize.Op.gt]: new Date(),
      },
    },
  });

  if (otp) {
    // Mark OTP as used
    await otp.update({ isUsed: true });
    return true;
  }

  return false;
};

// Clean up expired OTPs
Otp.cleanupExpired = async function() {
  await this.destroy({
    where: {
      expiresAt: {
        [sequelize.Sequelize.Op.lt]: new Date(),
      },
    },
  });
};

module.exports = Otp;