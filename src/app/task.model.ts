
// Define los datos que componen una tarea.

export interface Task {
  id: number;
  userId: string;
  title: string;
  description: string;
  imagePath?: string;

  // Fecha y hora en que se creó la tarea.
  createdAt?: string;
  // Coordenadas GPS de la tarea, si están disponibles.
  latitude?: number;
  longitude?: number;
  // Ciudad asociada a la ubicación de la tarea.
  city?: string;
}
