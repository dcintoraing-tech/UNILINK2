# Documentación Técnica de Arquitectura - SIBF - CAI

Esta guía contiene la información necesaria para la creación de diagramas de Clases, Paquetes y Entidad-Relación (ER), así como el flujo de procesos por rol.

## 1. Diagrama Entidad-Relación (Modelo de Datos Firestore)

Aunque Firestore es NoSQL, el sistema mantiene una integridad referencial lógica mediante IDs.

### Entidades y Atributos

#### **Colección: `userProfiles` (Personal)**
*   `id` (PK): UID de Firebase Auth.
*   `name`: Nombre completo.
*   `email`: Correo institucional.
*   `role`: [Admin, Jefe de carrera, Docente, Alumno].
*   `carreraId` (FK): Referencia a `carreras.id`.
*   `status`: [Activo, Inactivo].

#### **Colección: `students` (Alumnos)**
*   `id` (PK): ID autogenerado.
*   `firstName`, `lastName`: Datos personales.
*   `controlNumber`: Identificador único escolar.
*   `academicProgramId` (FK): Referencia a `carreras.id`.
*   `assignedGroupId` (FK): Referencia a `grupos.id`.
*   `facialImage`: String Base64 de la foto de registro.
*   `embedding`: Array de 128 números (Descriptor facial de IA).

#### **Colección: `carreras` (Catálogo)**
*   `id` (PK): ID autogenerado.
*   `name`: Nombre de la carrera.

#### **Colección: `grupos`**
*   `id` (PK): ID autogenerado.
*   `name`: Ejemplo "TI-11".
*   `carreraId` (FK): Referencia a `carreras.id`.
*   `turno`: [Matutino, Vespertino, Nocturno].
*   `cuatrimestre/semestre`: Nivel actual.

#### **Colección: `materiaAsignaciones`**
*   `id` (PK): ID autogenerado.
*   `materia`: Nombre de la materia.
*   `carreraId` (FK): Referencia a `carreras.id`.

#### **Colección: `attendance` (Asistencias)**
*   `id` (PK): Formato `att-{studentId}-{date}-{materiaId}`.
*   `studentId` (FK): Referencia a `students.id`.
*   `date`: Fecha (YYYY-MM-DD).
*   `materiaAsignacionId` (FK): Referencia a `materiaAsignaciones.id`.
*   `docenteId` (FK): Referencia a `userProfiles.id`.
*   `status`: [Presente, Retardo, Falta, Falta Justificada].
*   `arrivalTime`: Hora exacta del registro.

#### **Colección: `justificaciones`**
*   `id` (PK): ID autogenerado.
*   `studentId` (FK): Referencia a `students.id`.
*   `attendanceRecordId` (FK): Referencia a `attendance.id`.
*   `reason`: Motivo de la falta.
*   `status`: [Pendiente, Aprobado, Rechazado].

---

## 2. Diagrama de Paquetes (Organización del Código)

### Capas del Sistema

1.  **Capa de Presentación (`src/app`)**
    *   `(auth)`: Login de personal y acceso por No. Control para alumnos.
    *   `admin/`: Gestión global (Usuarios, Alumnos, Catálogos).
    *   `dashboard/`: Herramientas del docente (Pase de lista facial).
    *   `student/`: Vista de consulta del alumno.

2.  **Capa de UI (`src/components`)**
    *   `ui/`: Componentes atómicos basados en ShadCN.
    *   `logo.tsx`, `logout-button.tsx`: Elementos globales de marca y sesión.

3.  **Capa de Datos y Firebase (`src/firebase`)**
    *   `firestore/`: Hooks `useCollection` y `useDoc` para datos en tiempo real.
    *   `auth/`: Gestión de estados de sesión.
    *   `config.ts`: Credenciales de conexión al proyecto de Google Cloud.

4.  **Motor Biométrico (`public/models`)**
    *   Pesos de redes neuronales: `tinyFaceDetector`, `faceLandmark68` y `faceRecognition`.

---

## 3. Especificaciones de Inteligencia Artificial

El sistema utiliza **Client-Side Machine Learning** (Inferencia en el cliente) mediante la librería **face-api.js**.

### Modelos Utilizados
| Modelo | Función | Descripción Técnica |
| :--- | :--- | :--- |
| **Tiny Face Detector** | Detección | Red neuronal convolucional (CNN) optimizada para detectar rostros en tiempo real con bajo consumo de CPU. |
| **Face Landmark 68** | Alineación | Detecta 68 puntos clave en el rostro para asegurar que la cara esté en la posición correcta antes de analizarla. |
| **Face Recognition** | Identificación | Basado en una arquitectura tipo ResNet-34 que mapea un rostro a un vector (embedding) de 128 números. |

---

## 4. Flujos de Proceso por Rol de Usuario

### **A. Administrador**
1. Configuración de parámetros globales (tolerancia y límites).
2. Alta de catálogos (Carreras, Modalidades, Sedes).
3. Gestión de usuarios (Docentes y Jefes de Carrera).
4. Alta masiva de alumnos mediante Excel.
5. Supervisión de integridad de datos y respaldos.

### **B. Docente**
1. Consulta de grupos asignados.
2. Ejecución del Pase de Lista Facial (Sincronizado con horario).
3. Uso del modo simulación para verificación técnica.
4. Consulta de estadísticas de asistencia de sus grupos.

### **C. Jefe de Carrera**
1. Supervisión de reportes de su área académica.
2. Gestión de Justificaciones (Aprobación/Rechazo de solicitudes de alumnos).
3. Monitoreo de indicadores de deserción basados en inasistencias.

### **D. Alumno**
1. Acceso mediante Número de Control.
2. Consulta de historial de asistencias y faltas.
3. Envío de solicitudes de justificación para registros con estado "Falta".
