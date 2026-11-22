import { Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import {
  Directory,
  Filesystem,
} from '@capacitor/filesystem';


@Injectable({
  providedIn: 'root',
})
export class ImageService {

  // Directorio donde se almacenarán las imágenes de las tareas.
  private readonly IMAGE_DIRECTORY = 'task-images';

  /**
   * Abre la cámara del dispositivo y permite tomar una fotografía.
   */
  async takePicture(): Promise<string | null> {
    return this.captureImage(CameraSource.Camera);
  }

  /**
   * Abre la galería para seleccionar una imagen existente.
   */
  async selectPicture(): Promise<string | null> {
    return this.captureImage(CameraSource.Photos);
  }

  /**
   * Obtiene una imagen desde la cámara o la galería
   * y la guarda en el almacenamiento local.
   */
  private async captureImage(source: CameraSource): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source,
      });

      if (!image.webPath) {
        throw new Error('No fue posible obtener la imagen.');
      }

      return await this.savePicture(image.webPath, image.format);

    } catch (error) {

      // La cancelación de la cámara o galería no se considera un error.
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes('cancel')
      ) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Descarga la imagen obtenida y la guarda como archivo local.
   *
   * Retorna la ruta del archivo guardado.
   */
  private async savePicture(
    webPath: string,
    format: string,
  ): Promise<string> {

    const response = await fetch(webPath);

    if (!response.ok) {
      throw new Error('No fue posible obtener los datos de la imagen.');
    }

    const blob = await response.blob();
    const base64 = await this.blobToBase64(blob);

    // Utiliza el formato original informado por Capacitor.
    const extension = format.toLowerCase() === 'png' ? 'png' : 'jpeg';

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}.${extension}`;

    // Crea el directorio si todavía no existe.
    try {
        await Filesystem.mkdir({
            path: this.IMAGE_DIRECTORY,
            directory: Directory.Data,
            recursive: true,
        });
    } catch (error) {

    // La carpeta ya existe, por lo tanto podemos continuar.
        const message = error instanceof Error ? error.message : '';
        if (!message.toLowerCase().includes('already exists')) {
            throw error;
        }
    }

    // Guarda la imagen en el almacenamiento privado de la aplicación.
    await Filesystem.writeFile({
      path: `${this.IMAGE_DIRECTORY}/${fileName}`,
      data: base64,
      directory: Directory.Data,
    });

    return `${this.IMAGE_DIRECTORY}/${fileName}`;
  }

  /**
   * Convierte una imagen Blob a una cadena Base64.
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {

      const reader = new FileReader();

      reader.onloadend = () => {
        const result = reader.result;

        if (typeof result !== 'string') {
          reject(new Error('No fue posible procesar la imagen.'));
          return;
        }

        const base64 = result.split(',')[1];

        if (!base64) {
          reject(new Error('La imagen no contiene datos válidos.'));
          return;
        }

        resolve(base64);
      };

      reader.onerror = () => {
        reject(new Error('Error al leer la imagen.'));
      };

      reader.readAsDataURL(blob);
    });
  }

  /**
   * Recupera una imagen local y retorna su URI para mostrarla.
   */
  async getPicture(path: string): Promise<string> {
    const file = await Filesystem.getUri({
      path,
      directory: Directory.Data,
    });

    return Capacitor.convertFileSrc(file.uri);
  }

  /**
   * Elimina una imagen del almacenamiento local.
   */
  async deletePicture(path: string): Promise<void> {
    await Filesystem.deleteFile({
      path,
      directory: Directory.Data,
    });
  }
}
