import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // se importan 2 nuevos modulos de angular
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonItemSliding } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, addOutline, pencilOutline } from 'ionicons/icons';
import { Task } from '../task.model';

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
    IonItemSliding
  ],
})
export class HomePage {
  // Tareas que se muestran en la lista.
  task: Task[] = [
    {
      id: 1,
      title: 'Ejemplo uno',
      description: "Descripcion del ejemplo uno"
    },
    {
      id: 2,
      title: 'Ejemplo dos',
      description: "Descripcion del ejemplo dos"
    }
  ];

  // Valores enlazados con los campos del formulario.
  newTitle: string = "";
  newDescription: string = "";

  // ID de la tarea en edición; null indica que se está creando una tarea.
  editingTaskId: number | null = null;

  constructor() {
    // Registra los iconos que aparecen en la plantilla.
    addIcons({ trashOutline, addOutline, pencilOutline });
  }

  // Agrega una tarea o guarda los cambios de la tarea seleccionada.
  addTask() {
    if (this.newTitle.trim() === "" || this.newDescription.trim() === "") {
      return;
    }
    if (this.editingTaskId !== null) {
      this.task = this.task.map(task =>
        task.id === this.editingTaskId
          ? { ...task, title: this.newTitle, description: this.newDescription }
          : task
      );
    } else {
      this.task.push({
        id: Date.now(),
        title: this.newTitle,
        description: this.newDescription
      });
    }

    // Limpia el formulario y finaliza el modo de edición.
    this.newTitle = "";
    this.newDescription = "";
    this.editingTaskId = null;
  }

  // Quita de la lista la tarea que coincide con el ID recibido.
  deleteTask(id: number) {
    this.task = this.task.filter(task => task.id !== id);
  }

  // Carga los datos de la tarea en el formulario para editarlos.
  editTask(task: Task) {
    if (this.editingTaskId === task.id) {
      this.cancelEdit();
      return;
    }

    this.newTitle = task.title;
    this.newDescription = task.description;
    this.editingTaskId = task.id;
  }

  // Descarta la edición y deja el formulario vacío.
  cancelEdit() {
    this.newTitle = "";
    this.newDescription = "";
    this.editingTaskId = null;
  }
}
