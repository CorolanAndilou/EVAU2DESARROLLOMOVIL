
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
import { ImageService } from '../core/services/image.service';
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
  private readonly imageService = inject(ImageService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Lista de tareas correspondientes al usuario autenticado.
  task: Task[] = [];

  // Identificador del usuario que tiene la sesión activa.
  currentUserId: string | null = null;

  // Valores enlazados con los campos del formulario.
  newTitle = '';
  newDescription = '';

  // ID de la tarea en edición; null indica que se está creando una tarea.
  editingTaskId: number | null = null;

  // Imagen seleccionada para la tarea que se está creando o editando.
  imagePreview: string | null = null;
  selectedImagePath: string | null = null;

  // Conserva la imagen original mientras se edita una tarea.
  private originalImagePath: string | null = null;

  // Imágenes que se mostrarán en el listado de tareas.
  taskImages: Record<number, string> = {};

  // Mensaje para informar errores relacionados con imágenes.
  imageErrorMessage = '';

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
    await this.cancelEdit();
  }

  /**
   * Cierra la sesión y regresa a la pantalla de Login.
   */
  async logout(): Promise<void> {
    await this.authService.logout();

    this.currentUserId = null;
    this.task = [];

    await this.cancelEdit();

    await this.router.navigate(['/login']);
  }

  // Funciones para manejar la selección de imágenes.

  /**
   * Abre la cámara del dispositivo para tomar una fotografía.
   */
  async takePicture(): Promise<void> {
    await this.chooseImage('camera');
  }

  /**
   * Abre la galería para seleccionar una imagen existente.
   */
  async selectPicture(): Promise<void> {
    await this.chooseImage('gallery');
  }

  /**
   * Obtiene una imagen desde la cámara o galería
   * y prepara su vista previa para la tarea.
   */
  private async chooseImage(
    source: 'camera' | 'gallery',
  ): Promise<void> {
    try {
      const imagePath = source === 'camera'
        ? await this.imageService.takePicture()
        : await this.imageService.selectPicture();

      // Si el usuario cancela la selección, no realiza cambios.
      if (!imagePath) {
        return;
      }

      // Elimina una imagen temporal anterior si fue reemplazada.
      if (
        this.selectedImagePath &&
        this.selectedImagePath !== this.originalImagePath
      ) {
        await this.imageService.deletePicture(this.selectedImagePath);
      }

      // Guarda la ruta de la imagen seleccionada.
      this.selectedImagePath = imagePath;

      // Genera la dirección necesaria para mostrar la vista previa.
      this.imagePreview = await this.imageService.getPicture(imagePath);

      this.imageErrorMessage = '';

    } catch (error) {
      console.error('Error al seleccionar la imagen:', error);
      this.imageErrorMessage =
        'No fue posible cargar la imagen. Inténtalo nuevamente.';
    }
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
        imagePath: this.selectedImagePath ?? undefined,
      };

      await this.taskService.updateTask(
        this.currentUserId,
        updatedTask,
      );

      // Si se reemplazó la imagen, elimina el archivo anterior.
      if (
        this.originalImagePath &&
        this.originalImagePath !== this.selectedImagePath
      ) {
        await this.imageService.deletePicture(this.originalImagePath);
      }

    } else {
      // Construye una tarea asociada al usuario actual.
      const newTask: Task = {
        id: Date.now(),
        userId: this.currentUserId,
        title: this.newTitle.trim(),
        description: this.newDescription.trim(),
        imagePath: this.selectedImagePath ?? undefined,
      };

      await this.taskService.addTask(newTask);
    }

    // Actualiza la lista después de guardar los cambios.
    this.task = await this.taskService.getTasks(this.currentUserId);

    // Conserva la imagen guardada antes de limpiar el formulario.
    this.originalImagePath = this.selectedImagePath;

    await this.cancelEdit();
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
  async editTask(task: Task): Promise<void> {
    // Impide editar tareas de otra cuenta.
    if (!this.currentUserId || task.userId !== this.currentUserId) {
      return;
    }

    if (this.editingTaskId === task.id) {
      await this.cancelEdit();
      return;
    }

    // Limpia cualquier selección temporal anterior.
    await this.cancelEdit();

    this.newTitle = task.title;
    this.newDescription = task.description;
    this.editingTaskId = task.id;

    // Recupera la imagen original de la tarea, si existe.
    this.originalImagePath = task.imagePath ?? null;
    this.selectedImagePath = task.imagePath ?? null;

    this.imagePreview = task.imagePath
      ? await this.imageService.getPicture(task.imagePath)
      : null;
  }

  /**
   * Descarta la edición y deja el formulario vacío.
   * También elimina imágenes temporales que no fueron guardadas.
   */
  async cancelEdit(): Promise<void> {
    // Elimina la imagen seleccionada si es diferente de la original.
    if (
      this.selectedImagePath &&
      this.selectedImagePath !== this.originalImagePath
    ) {
      await this.imageService.deletePicture(this.selectedImagePath);
    }

    // Limpia los campos del formulario.
    this.newTitle = '';
    this.newDescription = '';
    this.editingTaskId = null;

    // Limpia los datos de la imagen.
    this.imagePreview = null;
    this.selectedImagePath = null;
    this.originalImagePath = null;
    this.imageErrorMessage = '';
  }
}
