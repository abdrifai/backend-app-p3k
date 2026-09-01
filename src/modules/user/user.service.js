import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import userRepository from './user.repository.js';
import { sendPasswordResetEmail } from '../../utils/email.service.js';
function normalizeRoles(data) {
  let roles = [];
  if (Array.isArray(data.roles) && data.roles.length > 0) {
    roles = data.roles.map(r => String(r).toLowerCase().trim()).filter(Boolean);
  } else if (data.role) {
    roles = String(data.role).toLowerCase().split(',').map(r => r.trim()).filter(Boolean);
  }
  if (roles.length === 0) roles = ['user'];
  return Array.from(new Set(roles));
}

function formatUser(user) {
  if (!user) return null;
  const roles = String(user.role || 'user').toLowerCase().split(',').map(r => r.trim()).filter(Boolean);
  return {
    ...user,
    roles,
    role: roles.join(',')
  };
}

class UserService {
  async register(data) {
    // Check if ACTIVE email exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      const error = new Error('Email is already registered');
      error.statusCode = 400;
      throw error;
    }

    // Check if ACTIVE username exists
    const existingUsername = await userRepository.findByUsername(data.username);
    if (existingUsername) {
      const error = new Error('Username is already registered');
      error.statusCode = 400;
      throw error;
    }

    const roles = normalizeRoles(data);
    const roleString = roles.join(',');

    // Check if SOFT-DELETED user exists with this username or email
    const softDeleted = await userRepository.findSoftDeletedUser(data.username, data.email);
    if (softDeleted) {
      return {
        isSoftDeleted: true,
        message: `User '${data.username}' sebelumnya pernah terdaftar dan berstatus Non-Aktif (dihapus). Apakah Anda ingin mengaktifkan kembali akun ini?`,
        existingUser: {
          id: softDeleted.id,
          username: data.username,
          email: data.email,
          namaLengkap: softDeleted.namaLengkap || data.namaLengkap,
          role: softDeleted.role || roleString,
          roles: String(softDeleted.role || roleString).toLowerCase().split(',').map(r => r.trim()).filter(Boolean)
        }
      };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Create user
    try {
      const createPayload = {
        username: data.username,
        email: data.email,
        namaLengkap: data.namaLengkap || '',
        role: roleString,
        password: hashedPassword
      };
      const created = await userRepository.create(createPayload);
      return formatUser(created);
    } catch (err) {
      if (err.code === 'P2002') {
        const error = new Error('Username or email is already registered');
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }
  }

  async reactivateUser(id, payload) {
    const updateData = { ...payload };
    if (payload.password && payload.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(payload.password, salt);
    } else {
      delete updateData.password;
    }

    if (payload.roles !== undefined || payload.role !== undefined) {
      const roles = normalizeRoles(payload);
      updateData.role = roles.join(',');
      delete updateData.roles;
    }

    const reactivated = await userRepository.reactivateUser(id, updateData);
    return formatUser(reactivated);
  }

  async login(username, password, { ip, userAgent } = {}) {
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

    // Update lastLoginAt, lastActiveAt, lastIpAddress, lastUserAgent
    await userRepository.updateLoginInfo(user.id, { ip, userAgent }).catch(() => {});

    const userRoles = String(user.role || 'user').toLowerCase().split(',').map(r => r.trim()).filter(Boolean);

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role,
        roles: userRoles
      },
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
        roles: userRoles,
        foto: user.foto,
        lastLoginAt: new Date(),
        lastActiveAt: new Date()
      },
      token
    };
  }

  async recordHeartbeat(userId, { ip, userAgent } = {}) {
    return await userRepository.updateHeartbeat(userId, { ip, userAgent });
  }

  async getOnlineUsersMonitoring() {
    return await userRepository.getOnlineUsersMonitoring();
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
    return formatUser(user);
  }

  async getAllUsers({ page = 1, limit = 10, search = '', status = 'active' }) {
    const isAll = limit === 'all';
    const skip = isAll ? 0 : (page - 1) * limit;
    const take = isAll ? 1000000 : limit;
    const { data, total } = await userRepository.findAll({ skip, take, search, status });

    return {
      data: data.map(formatUser),
      meta: {
        total,
        page: isAll ? 1 : page,
        limit: isAll ? total : limit,
        totalPages: isAll ? 1 : Math.ceil(total / limit)
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
    
    if (payload.roles !== undefined || payload.role !== undefined) {
      const roles = normalizeRoles(payload);
      updateData.role = roles.join(',');
    }

    if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(payload.password, salt);
    }

    try {
      const updated = await userRepository.update(id, updateData);
      return formatUser(updated);
    } catch (err) {
      if (err.code === 'P2002') {
        const error = new Error('Email or username is already registered');
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }
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

  async permanentDeleteUser(id, securityKey) {
    if (securityKey !== '234') {
      const error = new Error('Kunci keamanan tidak valid. Masukkan kunci keamanan yang benar ("234").');
      error.statusCode = 400;
      throw error;
    }

    const user = await userRepository.findByIdIncludeDeleted(id);
    if (!user) {
      const error = new Error('User tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return await userRepository.hardDelete(id);
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

    try {
      return await userRepository.update(id, updateData);
    } catch (err) {
      if (err.code === 'P2002') {
        const error = new Error('Email is already registered');
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }
  }
}

export default new UserService();
