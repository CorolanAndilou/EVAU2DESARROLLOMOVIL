import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonItemSliding,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, pencilOutline, trashOutline } from 'ionicons/icons';

import { AuthService } from '../core/services/auth.service';
import { TaskService } from '../core/services/task.service';
import type { Task } from '../task.model';

// Configura el componente y los elementos de Ionic que utiliza la página.
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonToolbar,
    IonHeader,
    IonTitle,
    IonContent,
    IonList,
    IonInput,
    IonLabel,
    IonItem,
    IonButton,
    IonIcon,
    IonItemSliding,
  ],
})
export class HomePage {

  // Inyección de los servicios y dependencias necesarios.
  private readonly authService = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly router = inject(Router);
  private readonly cdr = inject<ChangeDetectorRef>(
    // Angular obtiene el detector de cambios del componente.
    ChangeDetectorRef,
  );

  // Lista de tareas correspondientes al usuario autenticado.
  task: Task[] = [];

  // Identificador del usuario que tiene la sesión activa.
  currentUserId: string | null = null;

  // Valores enlazados con los campos del formulario.
  newTitle = '';
  newDescription = '';

  // ID de la tarea en edición; null indica que se está creando una tarea.
  editingTaskId: number | null = null;

  constructor() {
    addIcons({ trashOutline, addOutline, pencilOutline });
  }

  /**
   * Se ejecuta cada vez que Ionic muestra la página.
   * Recupera la sesión y carga las tareas del usuario.
   */
  async ionViewWillEnter(): Promise<void> {
    const session = await this.authService.getCurrentSession();

    // Si no existe una sesión válida, vuelve al Login.
    if (!session) {
      await this.router.navigate(['/login']);
      return;
    }

    this.currentUserId = session.userId;

    // Recupera solamente las tareas del usuario actual.
    this.task = await this.taskService.getTasks(this.currentUserId);

    // Actualiza la vista después de recuperar las tareas.
    this.cdr.detectChanges();

    // Limpia el formulario al entrar a Home.
    this.cancelEdit();
  }

  /**
   * Cierra la sesión y regresa a la pantalla de Login.
   */
  async logout(): Promise<void> {
    await this.authService.logout();

    this.currentUserId = null;
    this.task = [];

    this.cancelEdit();

    await this.router.navigate(['/login']);
  }

  /**
   * Agrega una tarea o guarda los cambios de una tarea existente.
   */
  async addTask(): Promise<void> {
    // El título es obligatorio, pero la descripción es opcional.
    if (!this.currentUserId || !this.newTitle.trim()) {
      return;
    }

    if (this.editingTaskId !== null) {
      // Actualiza la tarea verificando también su propietario.
      const updatedTask: Task = {
        id: this.editingTaskId,
        userId: this.currentUserId,
        title: this.newTitle.trim(),
        description: this.newDescription.trim(),
      };

      await this.taskService.updateTask(
        this.currentUserId,
        updatedTask,
      );
    } else {
      // Construye una tarea asociada al usuario actual.
      const newTask: Task = {
        id: Date.now(),
        userId: this.currentUserId,
        title: this.newTitle.trim(),
        description: this.newDescription.trim(),
      };

      await this.taskService.addTask(newTask);
    }

    // Actualiza la lista después de guardar los cambios.
    this.task = await this.taskService.getTasks(this.currentUserId);

    this.cancelEdit();
  }

  /**
   * Elimina una tarea perteneciente al usuario actual.
   */
  async deleteTask(id: number): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    await this.taskService.deleteTask(this.currentUserId, id);

    // Actualiza la lista después de eliminar la tarea.
    this.task = await this.taskService.getTasks(this.currentUserId);
  }

  /**
   * Carga los datos de una tarea en el formulario para editarlos.
   */
  editTask(task: Task): void {
    // Impide editar tareas de otra cuenta.
    if (!this.currentUserId || task.userId !== this.currentUserId) {
      return;
    }

    if (this.editingTaskId === task.id) {
      this.cancelEdit();
      return;
    }

    this.newTitle = task.title;
    this.newDescription = task.description;
    this.editingTaskId = task.id;
  }

  /**
   * Descarta la edición y deja el formulario vacío.
   */
  cancelEdit(): void {
    this.newTitle = '';
    this.newDescription = '';
    this.editingTaskId = null;
  }
}
