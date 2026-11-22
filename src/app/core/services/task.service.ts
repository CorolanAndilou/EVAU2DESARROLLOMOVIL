import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import type { Task } from '../../task.model';

/**
 * Servicio responsable de administrar las tareas.
 *
 * Funcionalidades:
 * - Guardar tareas localmente.
 * - Recuperar tareas por usuario.
 * - Crear, editar y eliminar tareas.
 * - Evitar modificar tareas pertenecientes a otra cuenta.
 */
@Injectable({
  providedIn: 'root',
})
export class TaskService {

  /** Clave utilizada para almacenar las tareas. */
  private readonly TASKS_KEY = 'app_tasks';

  /**
   * Recupera exclusivamente las tareas de un usuario.
   *
   * @param userId Identificador del usuario autenticado.
   * @returns Lista de tareas pertenecientes al usuario.
   */
  async getTasks(userId: string): Promise<Task[]> {

    const tasks = await this.getAllTasks();

    return tasks.filter(task => task.userId === userId);
  }

  /**
   * Registra una nueva tarea.
   *
   * @param task Datos de la tarea que se desea guardar.
   */
  async addTask(task: Task): Promise<void> {

    const tasks = await this.getAllTasks();

    // Evita registrar una tarea sin propietario.
    if (!task.userId) {
      throw new Error('La tarea debe tener un usuario asociado.');
    }

    tasks.push(task);

    await this.saveTasks(tasks);
  }

  /**
   * Actualiza una tarea perteneciente al usuario indicado.
   *
   * @param userId Identificador del propietario.
   * @param updatedTask Datos actualizados de la tarea.
   */
  async updateTask(
    userId: string,
    updatedTask: Task,
  ): Promise<void> {

    const tasks = await this.getAllTasks();

    const taskIndex = tasks.findIndex(
      task =>
        task.id === updatedTask.id &&
        task.userId === userId,
    );

    if (taskIndex === -1) {
      throw new Error('No se encontró la tarea solicitada.');
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      title: updatedTask.title,
      description: updatedTask.description,
    };

    await this.saveTasks(tasks);
  }

  /**
   * Elimina una tarea perteneciente al usuario indicado.
   *
   * @param userId Identificador del propietario.
   * @param taskId Identificador de la tarea.
   */
  async deleteTask(
    userId: string,
    taskId: number,
  ): Promise<void> {

    const tasks = await this.getAllTasks();

    const updatedTasks = tasks.filter(
      task => !(task.id === taskId && task.userId === userId),
    );

    await this.saveTasks(updatedTasks);
  }

  /**
   * Recupera todas las tareas almacenadas.
   *
   * Este método es privado para evitar que las páginas
   * accedan directamente a las tareas de otras cuentas.
   */
  private async getAllTasks(): Promise<Task[]> {

    const { value } = await Preferences.get({
      key: this.TASKS_KEY,
    });

    if (!value) {
      return [];
    }

    const parsedTasks: unknown = JSON.parse(value);

    if (!Array.isArray(parsedTasks)) {
      throw new Error('Los datos de tareas no son válidos.');
    }

    if (!parsedTasks.every(task => this.isValidTask(task))) {
      throw new Error('La información de una o más tareas está dañada.');
    }

    return parsedTasks;
  }

  /**
   * Comprueba la estructura de una tarea almacenada.
   */
  private isValidTask(value: unknown): value is Task {

    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const task = value as Record<string, unknown>;

    return (
      typeof task['id'] === 'number' &&
      Number.isFinite(task['id']) &&
      typeof task['userId'] === 'string' &&
      task['userId'].length > 0 &&
      typeof task['title'] === 'string' &&
      typeof task['description'] === 'string'
    );
  }

  /**
   * Guarda la colección completa de tareas.
   */
  private async saveTasks(tasks: Task[]): Promise<void> {

    await Preferences.set({
      key: this.TASKS_KEY,
      value: JSON.stringify(tasks),
    });
  }
}
