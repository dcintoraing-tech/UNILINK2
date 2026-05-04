# SIBF - CAI

**SIBF - CAI** es una plataforma integral de gestión académica con reconocimiento facial biométrico, diseñada para automatizar el control de asistencia y simplificar los procesos administrativos escolares.

## 🚀 Tecnologías Utilizadas

### Frontend & Diseño
- **Next.js 15**: Framework de React con App Router y renderizado optimizado.
- **TypeScript**: Programación tipada para mayor robustez y mantenibilidad.
- **Tailwind CSS**: Estilizado moderno basado en utilidades.
- **ShadCN UI**: Componentes de interfaz profesionales de alta accesibilidad.

### Backend & Datos
- **Firebase Firestore**: Base de datos NoSQL en tiempo real para alta disponibilidad.
- **Firebase Auth**: Autenticación segura y gestión de identidades.
- **SheetJS (XLSX)**: Motor de procesamiento para importación/exportación masiva de Excel.

### Inteligencia Artificial
- **face-api.js**: Implementación de biometría facial basada en TensorFlow.js que corre directamente en el navegador (Client-side AI).
- **Modelos**: Tiny Face Detector, Face Landmark 68 y Face Recognition (ResNet-34).

## 👥 Perfiles de Usuario

El sistema segmenta las funcionalidades mediante un control de acceso basado en roles:

- **Administrador**: Gestión de infraestructura, usuarios y configuración global del sistema.
- **Docente**: Operación del pase de lista facial y monitoreo de grupos.
- **Jefe de Carrera**: Supervisión de reportes académicos y validación de justificantes médicos/personales.
- **Alumno**: Consulta de historial de asistencias y trámite de justificaciones.

## 🧠 Motor de IA en el Navegador
El sistema utiliza tres redes neuronales específicas para el pase de lista:
1. **Tiny Face Detector**: Detección rápida de rostros en flujo de video.
2. **Face Landmark 68**: Localización de puntos clave para alineación facial.
3. **Face Recognition**: Generación de un vector de 128 dimensiones (`embedding`) que actúa como la "huella digital" del alumno.

## 🛠️ Gestión de Recursos

Para administrar los datos y usuarios a nivel técnico, se debe acceder a la **Consola de Firebase**:

1. **URL**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. **Proyecto**: Selecciona el proyecto con ID `studio-9397941301-d9e64`.
3. **Firestore Database**: Para edición manual de documentos.
4. **Authentication**: Para gestión de credenciales del personal.

Para más detalles técnicos sobre el modelo de datos, diagramas de clases y arquitectura, consulta el archivo `docs/ARCHITECTURE.md`.
