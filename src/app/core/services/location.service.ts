
import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Estructura de las coordenadas geográficas.
 */
export interface TaskLocation {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {

  /**
   * Obtiene la ubicación actual del dispositivo.
   *
   * Si no puede obtenerla, devuelve null para permitir
   * guardar la tarea igualmente.
   */
  async getCurrentLocation(): Promise<TaskLocation | null> {

    try {
      // Comprueba los permisos actuales.
      let permissions = await Geolocation.checkPermissions();

      console.log('Permisos de ubicación:', permissions);

      // Solicita permisos si todavía no están concedidos.
      if (
        permissions.location !== 'granted' &&
        permissions.coarseLocation !== 'granted'
      ) {
        permissions = await Geolocation.requestPermissions();
      }

      // Si no hay autorización, continúa sin ubicación.
      if (
        permissions.location !== 'granted' &&
        permissions.coarseLocation !== 'granted'
      ) {
        console.warn('Permisos de ubicación no concedidos.');
        return null;
      }

      console.log('Solicitando coordenadas...');

      // Permite utilizar fuentes de ubicación aproximada,
      // como la ubicación proporcionada mediante Wi-Fi.
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000,
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      console.log('Ubicación obtenida:', latitude, longitude);

      // Comprueba que las coordenadas sean válidas.
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        console.warn('Las coordenadas obtenidas no son válidas.');
        return null;
      }

      return {
        latitude,
        longitude,
      };

    } catch (error) {

      console.error(
        'Error al obtener la ubicación:',
        error,
      );

      return null;
    }
  }
}
