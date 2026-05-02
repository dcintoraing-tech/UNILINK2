# Documentación Técnica de Arquitectura - UniLink Access

Esta guía contiene la información necesaria para la creación de diagramas de Clases, Paquetes y Entidad-Relación (ER).

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

## 3. Flujo de Identificación Facial

1.  **Captura**: El navegador accede a la webcam vía `navigator.mediaDevices`.
2.  **Detección**: `face-api.js` localiza el rostro en el video.
3.  **Extracción**: Se genera un vector (embedding) del rostro actual.
4.  **Comparación**: Se calcula la distancia euclidiana entre el rostro actual y los embeddings de la colección `students`.
5.  **Registro**: Si hay coincidencia (>95% similitud), se busca la clase activa en el `Horario` y se escribe el documento en `attendance`.
