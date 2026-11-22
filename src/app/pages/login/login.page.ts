
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
} from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonItem,
    IonLabel,
  ],
})
export class LoginPage {
  // Inyección de los servicios y dependencias necesarios.
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';

  // Limpia los datos cada vez que se ingresa a esta pantalla.
  ionViewWillEnter(): void {
    this.email = '';
    this.password = '';
    this.errorMessage = '';
  }

  // Comprueba las credenciales e inicia la sesión.
  async login(): Promise<void> {
    this.errorMessage = '';

    try {
      await this.authService.login(this.email, this.password);

      await this.router.navigate(['/home']);
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesión.';
    }
  }

  // Navega hacia el formulario de registro.
  goToRegister(): void {
    void this.router.navigate(['/register']);
  }
}
