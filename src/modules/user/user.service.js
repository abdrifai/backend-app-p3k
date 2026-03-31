import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import userRepository from './user.repository.js';
import { sendPasswordResetEmail } from '../../utils/email.service.js';
class UserService {
  async register(data) {
    // Check if user exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      const error = new Error('Email is already registered');
      error.statusCode = 400;
      throw error;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Create user
    return await userRepository.create({
      ...data,
      password: hashedPassword
    });
  }

  async login(username, password) {
    // Find user
    const user = await userRepository.findByUsername(username);
    if (!user) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        namaLengkap: user.namaLengkap,
        role: user.role,
        foto: user.foto
      },
      token
    };
  }

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('email tidak terdaftar. silahkan periksa email yang anda masukan');
      error.statusCode = 404;
      throw error;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await userRepository.createPasswordResetToken(email, token, expiresAt);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    return { message: 'Tautan reset password telah dikirimkan ke email Anda.' };
  }

  async resetPassword(token, newPassword) {
    const resetToken = await userRepository.findPasswordResetToken(token);
    
    if (!resetToken) {
      const error = new Error('Token tidak valid atau sudah kadaluarsa');
      error.statusCode = 400;
      throw error;
    }

    if (new Date() > resetToken.expiresAt) {
      await userRepository.deletePasswordResetToken(resetToken.id);
      const error = new Error('Token sudah kadaluarsa. Silakan request reset password kembali.');
      error.statusCode = 400;
      throw error;
    }

    const user = await userRepository.findByEmail(resetToken.email);
    if (!user) {
      const error = new Error('User tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await userRepository.update(user.id, { password: hashedPassword });
    await userRepository.deletePasswordResetToken(resetToken.id);

    return { success: true, message: 'Password berhasil direset. Silakan login dengan password baru.' };
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      const error = new Error('User tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  async getAllUsers({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const { data, total } = await userRepository.findAll({ skip, take: limit, search });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateUser(id, payload) {
    const user = await userRepository.findById(id);
    if (!user) {
      const error = new Error('User tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = {};
    if (payload.namaLengkap !== undefined) updateData.namaLengkap = payload.namaLengkap;
    if (payload.email !== undefined) updateData.email = payload.email;
    if (payload.role !== undefined) updateData.role = payload.role;

    if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(payload.password, salt);
    }

    return await userRepository.update(id, updateData);
  }

  async deleteUser(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      const error = new Error('User tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return await userRepository.softDelete(id);
  }

  async updateProfile(id, payload, file) {
    const user = await userRepository.findById(id);
    if (!user) {
      const error = new Error('User tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updateData = {};
    if (payload.namaLengkap) updateData.namaLengkap = payload.namaLengkap;
    if (payload.email) updateData.email = payload.email;
    
    if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(payload.password, salt);
    }

    if (file) {
      updateData.foto = `/uploads/user-photo/${file.filename}`;
    }

    return await userRepository.update(id, updateData);
  }
}

export default new UserService();
