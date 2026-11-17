import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { User, UserSession } from '../../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly USERS_KEY = 'app_users';
  private readonly SESSION_KEY = 'app_session';

  private readonly ITERATIONS = 310000;

  // REGISTRO DE USUARIOS
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<void> {
    const users = await this.getUsers();

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = users.find(
      (user) => user.email === normalizedEmail,
    );

    if (existingUser) {
      throw new Error('Este correo ya está registrado.');
    }

    if (!name.trim() || !normalizedEmail || !password) {
      throw new Error('Todos los campos son obligatorios.');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);

    const newUser: User = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    await Preferences.set({
      key: this.USERS_KEY,
      value: JSON.stringify(users),
    });
  }

  // INICIO DE SESIÓN
  async login(email: string, password: string): Promise<void> {
    const users = await this.getUsers();

    const normalizedEmail = email.trim().toLowerCase();

    const user = users.find(
      (item) => item.email === normalizedEmail,
    );

    if (!user) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    const passwordHash = await this.hashPassword(
      password,
      user.salt,
    );

    if (passwordHash !== user.passwordHash) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    const session: UserSession = {
      userId: user.id,
      email: user.email,
    };

    await Preferences.set({
      key: this.SESSION_KEY,
      value: JSON.stringify(session),
    });
  }

  // CIERRE DE SESIÓN
  async logout(): Promise<void> {
    await Preferences.remove({
      key: this.SESSION_KEY,
    });
  }

  // RECUPERAR SESIÓN ACTUAL
  async getCurrentSession(): Promise<UserSession | null> {
    const { value } = await Preferences.get({
      key: this.SESSION_KEY,
    });

    if (!value) {
      return null;
    }

    try {
      const session: UserSession = JSON.parse(value);
      const users = await this.getUsers();

      const userExists = users.some(
        (user) => user.id === session.userId,
      );

      if (!userExists) {
        await this.logout();
        return null;
      }

      return session;
    } catch {
      await this.logout();
      return null;
    }
  }

  // COMPROBAR AUTENTICACIÓN
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null;
  }

  // RECUPERAR USUARIOS ALMACENADOS
  private async getUsers(): Promise<User[]> {
    const { value } = await Preferences.get({
      key: this.USERS_KEY,
    });

    if (!value) {
      return [];
    }

    const users: unknown = JSON.parse(value);

    if (!Array.isArray(users)) {
      throw new Error('Los datos de usuarios no son válidos.');
    }

    return users as User[];
  }

  // GENERAR SAL ALEATORIA
  private generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(16));

    return Array.from(salt)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // TRANSFORMAR CONTRASEÑA MEDIANTE PBKDF2
  private async hashPassword(
    password: string,
    salt: string,
  ): Promise<string> {
    const encoder = new TextEncoder();

    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const saltBytes = new Uint8Array(
      salt.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes.buffer as ArrayBuffer,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      passwordKey,
      256,
    );

    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
