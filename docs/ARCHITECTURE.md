# Documentación Técnica de Arquitectura

Esta guía contiene la información necesaria para la creación de diagramas de Clases (Dominio) y de Paquetes (Arquitectura).

## 1. Diagrama de Clases (Modelo de Datos)

### Entidades Principales

- **UserProfile (Personal/Admin)**
  - `id`: string (UID de Firebase Auth)
  - `name`: string
  - `email`: string
  - `role`: enum (Admin, Jefe de carrera, Docente, Alumno)
  - `carreraId`: string (Relación con Carrera)
  - `status`: enum (Activo, Inactivo)

- **Student (Estudiante)**
  - `id`: string (ID autogenerado)
  - `firstName`, `lastName`: string
  - `controlNumber`: string (Identificador único)
  - `academicProgramId`: string (Relación con Carrera)
  - `assignedGroupId`: string (Relación con Grupo)
  - `facialImage`: string (Base64)
  - `embedding`: number[] (Vector de 128 posiciones para IA)

- **Asistencia (AttendanceRecord)**
  - `id`: string (`att-{studentId}-{date}-{materiaId}`)
  - `studentId`: string
  - `date`: string (YYYY-MM-DD)
  - `status`: enum (Presente, Retardo, Falta, Falta Justificada)
  - `materiaAsignacionId`: string
  - `docenteId`: string

- **Catálogos**
  - `Carrera`: { id, name }
  - `Grupo`: { id, name, carreraId, turno, cuatrimestre }
  - `AsignacionMateria`: { id, materia, carreraId }
  - `Horario`: { id, grupoId, schedule: Map }

### Relaciones
- Una **Carrera** tiene muchos **Grupos** y muchas **Materias**.
- Un **Grupo** tiene muchos **Estudiantes** y un **Horario**.
- Un **Estudiante** tiene muchos **Registros de Asistencia**.
- Una **Asistencia** puede tener una **Justificación** (en caso de falta).

---

## 2. Diagrama de Paquetes (Organización del Código)

### Capas del Sistema

1. **Capa de Presentación (`src/app`)**
   - `(auth)`: Login y recuperación.
   - `admin/`: Paneles de gestión global.
   - `dashboard/`: Herramientas del docente (Pase de lista).
   - `student/`: Vista de consulta del alumno.

2. **Capa de UI (`src/components`)**
   - `ui/`: Componentes atómicos de ShadCN.
   - `logo.tsx`, `logout-button.tsx`: Componentes globales.

3. **Capa de Datos y Servicios (`src/firebase`)**
   - `firestore/`: Hooks personalizados para lectura en tiempo real.
   - `auth/`: Lógica de sesiones.
   - `config.ts`: Configuración de conexión al backend.

4. **Motor Biométrico (`public/models`)**
   - Contiene los pesos de las redes neuronales de `face-api.js`.

5. **Utilidades (`src/lib`)**
   - `utils.ts`: Formateo y clases condicionales.
   - `placeholder-images.ts`: Manejo de imágenes por defecto.
