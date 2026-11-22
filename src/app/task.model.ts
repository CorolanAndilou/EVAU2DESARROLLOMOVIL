
// Define los datos que componen una tarea.

export interface Task {
  id: number;
  userId: string;
  title: string;
  description: string;
  imagePath?: string;

  // Fecha y hora en que se creó la tarea.
  createdAt?: string;
}
