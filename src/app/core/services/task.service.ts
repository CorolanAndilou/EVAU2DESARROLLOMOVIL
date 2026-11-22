
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
 * - Registrar la fecha y hora de creación.
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
   */
  async getTasks(userId: string): Promise<Task[]> {

    const tasks = await this.getAllTasks();

    return tasks.filter(task => task.userId === userId);
  }

  /**
   * Registra una nueva tarea y su fecha de creación.
   */
  async addTask(task: Task): Promise<void> {

    const tasks = await this.getAllTasks();

    // Evita registrar una tarea sin propietario.
    if (!task.userId) {
      throw new Error('La tarea debe tener un usuario asociado.');
    }

    // Registra automáticamente la fecha y hora actuales.
    const newTask: Task = {
      ...task,
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);

    await this.saveTasks(tasks);
  }

  /**
   * Actualiza una tarea perteneciente al usuario indicado.
   *
   * Conserva la fecha original de creación.
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
      imagePath: updatedTask.imagePath,
    };

    await this.saveTasks(tasks);
  }

  /**
   * Elimina una tarea perteneciente al usuario indicado.
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
      typeof task['description'] === 'string' &&
      (
        task['createdAt'] === undefined ||
        (
          typeof task['createdAt'] === 'string' &&
          !Number.isNaN(Date.parse(task['createdAt']))
        )
      )
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
