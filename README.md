# SIBF - CAI

Este proyecto es una plataforma de gestión académica con reconocimiento facial integrada con Firebase.

## 🚀 Tecnologías Utilizadas

### Frontend & Diseño
- **Next.js 15**: Framework de React con App Router.
- **TypeScript**: Programación tipada para mayor robustez.
- **Tailwind CSS**: Estilizado mediante utilidades CSS.
- **ShadCN UI**: Componentes de interfaz profesionales y accesibles.

### Backend & Datos
- **Firebase Firestore**: Base de datos NoSQL en tiempo real.
- **Firebase Auth**: Autenticación segura de usuarios.
- **SheetJS (XLSX)**: Procesamiento de archivos Excel.

### Inteligencia Artificial
- **face-api.js**: Motor biométrico basado en TensorFlow.js.
- **Genkit**: Framework para integración de modelos LLM (Gemini).

## 🧠 Modelos de IA en el Navegador
El sistema utiliza tres redes neuronales específicas para el pase de lista:
1. **Tiny Face Detector**: Detección rápida de rostros en video.
2. **Face Landmark 68**: Localización de rasgos faciales.
3. **Face Recognition**: Generación de descriptores faciales de 128 dimensiones.

## 🛠️ Cómo gestionar tu Base de Datos

Para ver y administrar los datos y usuarios, debes ingresar a la **Consola de Firebase**:

1. **URL**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. **Proyecto**: Selecciona el proyecto con ID `studio-9397941301-d9e64`.
3. **Firestore Database**: Aquí puedes ver y editar todas las colecciones de datos (Alumnos, Asistencias, Carreras, etc.).
4. **Authentication**: Aquí puedes gestionar las cuentas de acceso del personal (Admin, Docentes, Jefes de Carrera).

Para más detalles técnicos sobre el modelo de datos y la arquitectura para tus diagramas, consulta `docs/ARCHITECTURE.md`.
