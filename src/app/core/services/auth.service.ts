import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { User, UserSession } from '../../models/user.model';

/**
 * Servicio responsable de gestionar la autenticación local.
 *
 * Funcionalidades:
 * - Registro de usuarios.
 * - Verificación de credenciales.
 * - Generación y comprobación de contraseñas mediante PBKDF2.
 * - Persistencia local de usuarios y sesiones.
 * - Recuperación y validación de la sesión actual.
 */

@Injectable({
  providedIn: 'root',
})

export class AuthService {

  /** Clave utilizada para almacenar los usuarios registrados. */
  private readonly USERS_KEY = 'app_users';

  /** Clave utilizada para almacenar la sesión activa. */
  private readonly SESSION_KEY = 'app_session';

  /** Cantidad de iteraciones utilizadas por PBKDF2. */
  private readonly ITERATIONS = 310000;

  /** Longitud mínima de las contraseñas nuevas. */
  private readonly MIN_PASSWORD_LENGTH = 8;

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<void> {

    // Normaliza los datos antes de realizar las validaciones.
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Comprueba que los campos obligatorios tengan contenido.
    if (!normalizedName || !normalizedEmail || !password) {
      throw new Error('Todos los campos son obligatorios.');
    }

    // Comprueba que el correo tenga una estructura válida.
    if (!this.isValidEmail(normalizedEmail)) {
      throw new Error('Ingresa un correo electrónico válido.');
    }

    // Comprueba la longitud mínima de la contraseña.
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(
        `La contraseña debe tener al menos ${this.MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }

    // Recupera las cuentas almacenadas localmente.
    const users = await this.getUsers();

    // Evita registrar dos cuentas con el mismo correo.
    const existingUser = users.find(
      (user) => user.email === normalizedEmail,
    );

    if (existingUser) {
      throw new Error('Este correo ya está registrado.');
    }

    // Genera una salt aleatoria exclusiva para el usuario.
    const salt = this.generateSalt();

    // Transforma la contraseña original en un hash.
    const passwordHash = await this.hashPassword(password, salt);

    // Construye el objeto que representa al nuevo usuario.
    const newUser: User = {
      id: crypto.randomUUID(),
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    // Incorpora el usuario a la colección.
    users.push(newUser);

    // Persiste la colección actualizada.
    await Preferences.set({
      key: this.USERS_KEY,
      value: JSON.stringify(users),
    });
  }

  /**
   * Autentica a un usuario mediante correo y contraseña.
   *
   * Si las credenciales son correctas, crea y almacena
   * una sesión local asociada al identificador del usuario.
   */

  async login(email: string, password: string): Promise<void> {

    // Normaliza el correo para evitar diferencias de mayúsculas.
    const normalizedEmail = email.trim().toLowerCase();

    // Evita procesar credenciales vacías.
    if (!normalizedEmail || !password) {
      throw new Error('Ingresa tu correo y contraseña.');
    }

    // Comprueba el formato del correo.
    if (!this.isValidEmail(normalizedEmail)) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    // Recupera los usuarios registrados.
    const users = await this.getUsers();

    // Busca una cuenta que coincida con el correo.
    const user = users.find(
      (item) => item.email === normalizedEmail,
    );

    // Utiliza un mensaje genérico para no revelar si existe la cuenta.
    if (!user) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    // Calcula nuevamente el hash utilizando la sal almacenada.
    const passwordHash = await this.hashPassword(
      password,
      user.salt,
    );

    // Compara el resultado con el hash registrado.
    if (passwordHash !== user.passwordHash) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    // Construye la sesión correspondiente al usuario autenticado.
    const session: UserSession = {
      userId: user.id,
      email: user.email,
    };

    // Guarda la sesión para conservarla entre aperturas.
    await Preferences.set({
      key: this.SESSION_KEY,
      value: JSON.stringify(session),
    });
  }

  /**
   * Cierra la sesión del usuario actual.
   *
   * Elimina la sesión almacenada, pero conserva
   * las cuentas registradas y sus contraseñas.
   */
  async logout(): Promise<void> {
    await Preferences.remove({
      key: this.SESSION_KEY,
    });
  }

  /**
   * Recupera y valida la sesión almacenada.
   *
   * Comprueba que:
   * - Exista información de sesión.
   * - Su estructura sea válida.
   * - El usuario asociado todavía exista.
   * - El correo coincida con el usuario registrado.
   *
   * Si la sesión no es válida, la elimina.
   */

  async getCurrentSession(): Promise<UserSession | null> {

    const { value } = await Preferences.get({
      key: this.SESSION_KEY,
    });

    // No existe una sesión almacenada.
    if (!value) {
      return null;
    }

    try {

      // Interpreta los datos guardados como un objeto JSON.
      const parsedSession: unknown = JSON.parse(value);

      // Comprueba que la estructura de la sesión sea válida.
      if (!this.isValidSession(parsedSession)) {
        await this.logout();
        return null;
      }

      const session = parsedSession;

      // Recupera los usuarios para comprobar la existencia de la cuenta.
      const users = await this.getUsers();

      const user = users.find(
        (item) => item.id === session.userId,
      );

      // Comprueba que la cuenta exista y que el correo coincida.
      if (!user || user.email !== session.email) {
        await this.logout();
        return null;
      }

      return session;

    } catch (error) {

      // Elimina la sesión cuando los datos almacenados son inválidos.
      await this.logout();

      // Conserva los errores de almacenamiento en lugar de ocultarlos.
      if (this.isStorageError(error)) {
        throw error;
      }

      return null;
    }
  }

  /**
   * Comprueba si existe una sesión válida.
   */

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();

    return session !== null;
  }

  /**
   * Recupera los usuarios almacenados localmente.
   *
   * Comprueba que el contenido sea un arreglo y que
   * cada usuario tenga los campos esperados.
   */

  private async getUsers(): Promise<User[]> {

    const { value } = await Preferences.get({
      key: this.USERS_KEY,
    });

    // Si todavía no existen usuarios, devuelve una colección vacía.
    if (!value) {
      return [];
    }

    // Interpreta el contenido como información no confiable.
    const parsedUsers: unknown = JSON.parse(value);

    // Comprueba que el contenido principal sea un arreglo.
    if (!Array.isArray(parsedUsers)) {
      throw new Error('Los datos de usuarios no son válidos.');
    }

    // Comprueba que cada elemento tenga la estructura esperada.
    if (!parsedUsers.every((user) => this.isValidUser(user))) {
      throw new Error('La información de uno o más usuarios está dañada.');
    }

    return parsedUsers;
  }

  /**
   * Comprueba que un objeto tenga la estructura esperada de User.
   *
   * No sustituye la validación del servidor ni protege frente
   * a la manipulación intencional del almacenamiento local.
   */

  private isValidUser(value: unknown): value is User {

    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const user = value as Record<string, unknown>;

    return (
      typeof user['id'] === 'string' &&
      user['id'].length > 0 &&
      typeof user['name'] === 'string' &&
      typeof user['email'] === 'string' &&
      this.isValidEmail(user['email']) &&
      typeof user['passwordHash'] === 'string' &&
      /^[a-f0-9]{64}$/i.test(user['passwordHash']) &&
      typeof user['salt'] === 'string' &&
      /^[a-f0-9]{32}$/i.test(user['salt']) &&
      typeof user['createdAt'] === 'string' &&
      !Number.isNaN(Date.parse(user['createdAt']))
    );
  }

  /**
   * Comprueba que una sesión tenga los campos requeridos.
   */

  private isValidSession(value: unknown): value is UserSession {

    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const session = value as Record<string, unknown>;

    return (
      typeof session['userId'] === 'string' &&
      session['userId'].length > 0 &&
      typeof session['email'] === 'string' &&
      this.isValidEmail(session['email'])
    );
  }

  /**
   * Comprueba el formato básico de una dirección de correo.
   *
   * Esta validación comprueba su estructura, pero no verifica
   * que el correo exista realmente.
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Genera una sal criptográficamente aleatoria de 16 bytes.
   *
   * La sal se almacena junto al hash y permite que cada usuario
   * tenga un resultado de hash diferente, incluso con contraseñas iguales.
   */
  private generateSalt(): string {

    const salt = crypto.getRandomValues(new Uint8Array(16));

    return Array.from(salt)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Calcula el hash de una contraseña mediante PBKDF2.
   *
   * Parámetros:
   * - Algoritmo: PBKDF2.
   * - Función hash: SHA-256.
   * - Iteraciones: 310.000.
   * - Sal: 16 bytes.
   * - Resultado: 256 bits.
   */

  private async hashPassword(
    password: string,
    salt: string,
  ): Promise<string> {

    const encoder = new TextEncoder();

    // Importa la contraseña como material criptográfico.
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    // Convierte la sal hexadecimal nuevamente a bytes.
    const saltBytes = new Uint8Array(
      salt.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    // Deriva el hash utilizando los parámetros establecidos.
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

    // Convierte el resultado binario a una cadena hexadecimal.
    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Identifica errores relacionados con el almacenamiento.
   *
   * Permite distinguir errores de datos inválidos de errores
   * producidos al acceder a Capacitor Preferences.
   */
  private isStorageError(error: unknown): boolean {

    return (
      error instanceof Error &&
      (
        error.message.includes('Preferences') ||
        error.message.includes('storage') ||
        error.message.includes('Storage')
      )
    );
  }
}