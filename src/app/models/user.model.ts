export interface User {
    id: string; // Id del usuario
    name: string; // Nombre del usuario
    email: string; // Correo electrónico del usuario
    passwordHash: string; // Hash de la contraseña del usuario
    salt: string; // Salt para el hash de la contraseña
    createdAt: string; // Fecha de creación del usuario
}

export interface UserSession {
    userId: string; // Id del usuario
    email: string; // Correo electrónico del usuario
}
