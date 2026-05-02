# UniLink Access - Guía de Gestión

Este proyecto es una plataforma de gestión académica con reconocimiento facial integrada con Firebase.

## 🚀 Cómo gestionar tu Base de Datos

Para ver y administrar los datos y usuarios, debes ingresar a la **Consola de Firebase**:

1. **URL**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. **Proyecto**: Selecciona el proyecto con ID `studio-9397941301-d9e64`.
3. **Firestore Database**: Aquí puedes ver y editar todas las colecciones de datos (Alumnos, Asistencias, Carreras, etc.).
4. **Authentication**: Aquí puedes gestionar las cuentas de acceso del personal (Admin, Docentes, Jefes de Carrera).

## 🛠️ Estructura del Proyecto

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + ShadCN UI.
- **Backend**: Firebase Firestore (Base de datos NoSQL).
- **Autenticación**: Firebase Auth.
- **IA**: `face-api.js` para el procesamiento biométrico en el cliente.

Para más detalles técnicos sobre el modelo de datos y la arquitectura para tus diagramas, consulta `docs/ARCHITECTURE.md`.
