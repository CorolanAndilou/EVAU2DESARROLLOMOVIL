
import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  // Limpia los datos cada vez que se ingresa a esta pantalla.
  ionViewWillEnter() {
    this.email = '';
    this.password = '';
    this.errorMessage = '';
  }

  // Comprueba las credenciales e inicia la sesión.
  async login() {
    this.errorMessage = '';

    try {
      await this.authService.login(this.email, this.password);

      await this.router.navigate(['/home']);

    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesión.';

      // Actualiza inmediatamente el mensaje en pantalla.
      this.cdr.detectChanges();
    }
  }

  // Navega hacia el formulario de registro.
  goToRegister() {
    this.router.navigate(['/register']);
  }
}
