import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/database.js';
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
  const p3k = user.dataP3k || user.dataP3kParuhWaktu || null;
  const p3kNama = p3k ? [p3k.gelarDepan, p3k.nama, p3k.gelarBelakang].filter(Boolean).join(' ').trim() || p3k.nama : null;

  return {
    ...user,
    roles,
    role: roles.join(','),
    nik: user.pejabatPenandatangan?.nik || null,
    jabatanPejabat: user.pejabatPenandatangan?.jabatan || null,
    nipPejabat: user.pejabatPenandatangan?.nip || null,
    dataP3kId: user.dataP3kId || null,
    dataP3kParuhWaktuId: user.dataP3kParuhWaktuId || null,
    jenisPegawaiPortal: user.jenisPegawaiPortal || null,
    pegawaiP3k: p3k ? {
      id: p3k.id,
      nipBaru: p3k.nipBaru,
      nama: p3kNama,
      jabatanNama: p3k.jabatanNama,
      unorNama: p3k.unorNama,
      kategori: user.dataP3kId ? 'PENUH_WAKTU' : 'PARUH_WAKTU'
    } : null
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
        password: hashedPassword,
        nik: data.nik || null,
        jabatanPejabat: data.jabatanPejabat || null,
        nipPejabat: data.nipPejabat || null,
        dataP3kId: data.dataP3kId || null,
        dataP3kParuhWaktuId: data.dataP3kParuhWaktuId || null,
        jenisPegawaiPortal: data.dataP3kId ? 'PENUH_WAKTU' : (data.dataP3kParuhWaktuId ? 'PARUH_WAKTU' : null)
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
    const cleanUsername = String(username || '').trim();
    // Find user by username or email
    const user = await userRepository.findByUsername(cleanUsername);
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

    // Jika user adalah pegawai portal, pastikan data P3K masih aktif
    if (userRoles.includes('pegawai')) {
      const isMultiRoleAdminOrUser = userRoles.some(r => ['admin', 'admin_utama', 'superadmin', 'user', 'verifikator', 'pensiun', 'pejabat_ttd'].includes(r));
      if (!user.dataP3kId && !user.dataP3kParuhWaktuId) {
        if (!isMultiRoleAdminOrUser) {
          const error = new Error('Akun pegawai tidak tertaut dengan data P3K aktif.');
          error.statusCode = 403;
          throw error;
        }
      } else if (user.dataP3kId) {
        const p3k = await prisma.dataP3k.findFirst({
          where: { id: user.dataP3kId, isDeleted: false, statusPensiun: 'AKTIF' },
          select: { id: true }
        });
        if (!p3k && !isMultiRoleAdminOrUser) {
          const error = new Error('Status kepegawaian Anda sudah tidak aktif atau pensiun.');
          error.statusCode = 403;
          throw error;
        }
      } else if (user.dataP3kParuhWaktuId) {
        const paruh = await prisma.dataP3kParuhWaktu.findFirst({
          where: { id: user.dataP3kParuhWaktuId, isDeleted: false, statusPensiun: 'AKTIF' },
          select: { id: true }
        });
        if (!paruh && !isMultiRoleAdminOrUser) {
          const error = new Error('Status kepegawaian Anda sudah tidak aktif atau pensiun.');
          error.statusCode = 403;
          throw error;
        }
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role,
        roles: userRoles,
        dataP3kId: user.dataP3kId || null,
        dataP3kParuhWaktuId: user.dataP3kParuhWaktuId || null,
        jenisPegawaiPortal: user.jenisPegawaiPortal || null
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
        dataP3kId: user.dataP3kId || null,
        dataP3kParuhWaktuId: user.dataP3kParuhWaktuId || null,
        jenisPegawaiPortal: user.jenisPegawaiPortal || null,
        mustChangePassword: Boolean(user.mustChangePassword),
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

    const frontendBase = (process.env.FRONTEND_URL || 'https://sipppk.tojounauna.go.id').replace(/\/+$/, '');
    const resetUrl = `${frontendBase}/reset-password?token=${token}`;
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

    if (payload.nik !== undefined) updateData.nik = payload.nik;
    if (payload.jabatanPejabat !== undefined) updateData.jabatanPejabat = payload.jabatanPejabat;
    if (payload.nipPejabat !== undefined) updateData.nipPejabat = payload.nipPejabat;

    if (payload.dataP3kId !== undefined) {
      updateData.dataP3kId = payload.dataP3kId || null;
      if (payload.dataP3kId) {
        updateData.jenisPegawaiPortal = 'PENUH_WAKTU';
        updateData.dataP3kParuhWaktuId = null;
      }
    }
    if (payload.dataP3kParuhWaktuId !== undefined) {
      updateData.dataP3kParuhWaktuId = payload.dataP3kParuhWaktuId || null;
      if (payload.dataP3kParuhWaktuId) {
        updateData.jenisPegawaiPortal = 'PARUH_WAKTU';
        updateData.dataP3kId = null;
      }
    }
    if (payload.dataP3kId === null && payload.dataP3kParuhWaktuId === null) {
      updateData.dataP3kId = null;
      updateData.dataP3kParuhWaktuId = null;
      updateData.jenisPegawaiPortal = null;
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
