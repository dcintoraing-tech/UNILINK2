
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Camera, Users, FilePlus, Group, Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as faceapi from 'face-api.js';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, writeBatch, collection, addDoc } from 'firebase/firestore';


// --- DATA PERSISTENCE & TYPES ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key);
                if (item) {
                    setStoredValue(JSON.parse(item));
                }
            } catch (error) {
                console.log(error);
            }
            setIsInitialized(true);
        }
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        if (!isInitialized) return;
        try {
            setStoredValue(currentStoredValue => {
                const valueToStore = value instanceof Function ? value(currentStoredValue) : value;
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                    window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
                }
                return valueToStore;
            });
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                 try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.log(error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key]);

    return [storedValue, setValue] as const;
};

// --- INTERFACES ---
interface Student {
    id: string;
    firstName: string;
    lastName: string;
    controlNumber: string;
    academicProgramId: string;
    assignedGroupId: string;
    facialImage: string | null;
    embedding: number[] | null;
}

interface Grupo { id: string; name: string; }
interface AsignacionMateria { id: string; materia: string; }

interface HorarioBlock {
    materiaId: string;
    docenteId: string;
    duracion: 1 | 2;
}
type DaySchedule = { [blockIndex: number]: HorarioBlock | null };
type ScheduleData = { [day: number]: DaySchedule };
interface Horario {
    id: string; // Same as grupoId
    grupoId: string;
    schedule: ScheduleData;
}

interface AttendanceConfig {
    toleranceMinutes: number;
    absenceLimitMinutes: number;
}

type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';
type DisplayStatus = AttendanceStatus | 'Pendiente';

interface AttendanceRecord {
    id: string;
    studentId: string;
    date: string;
    materiaAsignacionId: string;
    status: AttendanceStatus;
    docenteId?: string;
    arrivalTime?: string;
}

interface DisplayStudent extends Student {
    status: DisplayStatus;
    arrivalTime?: string;
    subjectName?: string;
}

interface Justificacion {
    id: string;
    studentId: string;
    date: string;
    reason: string;
    status: 'Pendiente' | 'Aprobado' | 'Rechazado';
    attendanceRecordId: string;
    docenteId: string;
    materiaId: string;
}

// --- MAIN COMPONENT ---
export default function TeacherAttendancePage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    
    // --- Data from Firestore ---
    const { data: allStudentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: horariosData } = useCollection<Horario>(useMemoFirebase(() => collection(firestore, 'horarios'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    const { data: materiasData } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
    const { data: attendanceData } = useCollection<AttendanceRecord>(useMemoFirebase(() => collection(firestore, 'attendance'), [firestore]));
    
    // --- Local Storage Data ---
    const [config] = useLocalStorage<AttendanceConfig>('unilink-attendance-config', {
        toleranceMinutes: 10,
        absenceLimitMinutes: 30,
    });
    
    const allStudents = allStudentsData || [];
    const horarios = horariosData || [];
    const grupos = gruposData || [];
    const materias = materiasData || [];
    const attendance = attendanceData || [];

    // --- Component State ---
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupStudentList, setGroupStudentList] = useState<DisplayStudent[]>([]);

    const [isTakingAttendance, setIsTakingAttendance] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);

    const [isJustifyOpen, setIsJustifyOpen] = useState(false);
    const [justifyingStudent, setJustifyingStudent] = useState<DisplayStudent | null>(null);
    const [justificationReason, setJustificationReason] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            try {
                if (typeof window === 'undefined') return;

                if (window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                    const errorMsg = 'El acceso a la cámara y los modelos de IA no están disponibles en un entorno no seguro. Por favor, usa una conexión HTTPS.';
                    setModelError(errorMsg);
                    return;
                }

                const MODEL_URL = window.location.origin + '/models';
                console.log("Cargando modelos de IA desde:", MODEL_URL);

                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                
                console.log("¡Todos los modelos de IA se cargaron exitosamente! ✅");
                setModelsLoaded(true);
                setModelError(null);

            } catch (error) {
                console.error("ERROR REAL AL CARGAR MODELOS:", error);
                const userFriendlyMessage = "No se pudieron cargar los modelos de IA. Esto suele ocurrir si los archivos en la carpeta /public/models no son accesibles o están corruptos. Verifica la consola del navegador para ver el error específico.";
                setModelError(userFriendlyMessage);
            }
        };
        loadModels();
    }, []);

    // Create FaceMatcher when group changes
    const faceMatcher = useMemo(() => {
        if (!selectedGroup || allStudents.length === 0 || !modelsLoaded) return null;

        const studentsInGroup = allStudents.filter(s => s.assignedGroupId === selectedGroup && s.embedding && s.embedding.length > 0);

        if (studentsInGroup.length === 0) {
            console.log("No students with embeddings in this group.");
            return null;
        }

        try {
            const labeledFaceDescriptors = studentsInGroup.map(student =>
                new faceapi.LabeledFaceDescriptors(
                    student.id,
                    [Float32Array.from(student.embedding!)]
                )
            );

            if (labeledFaceDescriptors.length === 0) return null;

            return new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
        } catch (error) {
            console.error("Error creating FaceMatcher:", error);
            toast({
                variant: 'destructive',
                title: 'Error de IA',
                description: 'No se pudo crear el comparador de rostros.',
            });
            return null;
        }
    }, [selectedGroup, allStudents, modelsLoaded, toast]);

    useEffect(() => {
        if (selectedGroup) {
            const filteredStudents = allStudents.filter(s => s.assignedGroupId === selectedGroup);
            const displayList: DisplayStudent[] = filteredStudents.map(student => ({
                ...student,
                status: 'Pendiente',
            }));
            setGroupStudentList(displayList);
        } else {
            setGroupStudentList([]);
        }
    }, [selectedGroup, allStudents]);

    const stopCamera = useCallback(() => {
        if (recognitionIntervalRef.current) {
            clearInterval(recognitionIntervalRef.current);
            recognitionIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    }, []);

    const markAttendance = useCallback((studentId: string) => {
        const studentToMark = groupStudentList.find(s => s.id === studentId);

        if (!studentToMark || studentToMark.status !== 'Pendiente') {
            return; // Already marked
        }

        const now = new Date();
        const dateString = now.toISOString().split('T')[0];
        let subjectName = 'Clase de Prueba';
        let materiaId = 'default-materia';
        let docenteId = 'default-docente';
        let status: AttendanceStatus = 'Presente';

        const studentSchedule = horarios.find(h => h.grupoId === studentToMark.assignedGroupId);
        if (studentSchedule) {
            const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
            const todaySchedule = studentSchedule.schedule?.[dayIndex];
            if (todaySchedule) {
                const firstBlockKey = Object.keys(todaySchedule).map(Number).sort((a, b) => a - b).find(key => todaySchedule[key] !== null);
                if (firstBlockKey !== undefined) {
                    const block = todaySchedule[firstBlockKey];
                    const horaInicioStr = ["07:00", "08:00", "09:00", "10:00"][firstBlockKey];
                    if (block && horaInicioStr) {
                        materiaId = block.materiaId;
                        docenteId = block.docenteId;
                        subjectName = materias.find(m => m.id === block.materiaId)?.materia || 'Materia Desconocida';

                        const [hours, minutes] = horaInicioStr.split(':').map(Number);
                        const startTime = new Date(now);
                        startTime.setHours(hours, minutes, 0, 0);
                        const toleranceTime = new Date(startTime);
                        toleranceTime.setMinutes(startTime.getMinutes() + config.toleranceMinutes);
                        status = now <= toleranceTime ? 'Presente' : 'Retardo';
                    }
                }
            }
        }

        const arrivalTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setGroupStudentList(prevList =>
            prevList.map(s =>
                s.id === studentId
                    ? { ...s, status, arrivalTime, subjectName }
                    : s
            )
        );

        const recordId = `att-${studentId}-${dateString}-${materiaId}`;
        const recordExists = attendance.some(a => a.id === recordId);

        if (!recordExists) {
            const recordRef = doc(firestore, 'attendance', recordId);
            const newRecordData = {
                studentId: studentId,
                date: dateString,
                materiaAsignacionId: materiaId,
                docenteId: docenteId,
                status: status,
                arrivalTime: arrivalTime
            };
            setDoc(recordRef, newRecordData).catch(err => {
                console.error("Error writing attendance record: ", err);
                toast({ variant: 'destructive', title: 'Error de Red', description: 'No se pudo guardar la asistencia.' });
            });
        }

        toast({
            title: `Asistencia Registrada (${status})`,
            description: `${studentToMark.firstName} ${studentToMark.lastName} para ${subjectName}.`,
        });
    }, [groupStudentList, horarios, materias, config, toast, attendance, firestore]);

    // Recognition loop
    useEffect(() => {
        if (isTakingAttendance && modelsLoaded && faceMatcher && videoRef.current) {
            recognitionIntervalRef.current = setInterval(async () => {
                if (videoRef.current && canvasRef.current && !videoRef.current.paused && videoRef.current.readyState >= 3) {
                    setIsDetecting(true);
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    
                    const displaySize = { width: video.clientWidth, height: video.clientHeight };
                    faceapi.matchDimensions(canvas, displaySize);

                    try {
                        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);

                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            // faceapi.draw.drawDetections(canvas, resizedDetections);
                            resizedDetections.forEach(detection => {
                                const box = detection.detection.box
                                const drawBox = new faceapi.draw.DrawBox(box, { label: 'Rostro' })
                                drawBox.draw(canvas)
                            })
                        }

                        if (detections.length > 0 && faceMatcher) {
                            for (const detection of detections) {
                                const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                                if (bestMatch.label !== 'unknown') {
                                    markAttendance(bestMatch.label);
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Error en detección:", err);
                    }
                    setIsDetecting(false);
                }
            }, 1000); 
        } else {
             if (recognitionIntervalRef.current) {
                clearInterval(recognitionIntervalRef.current);
            }
        }

        return () => {
            if (recognitionIntervalRef.current) {
                clearInterval(recognitionIntervalRef.current);
            }
        };
    }, [isTakingAttendance, modelsLoaded, faceMatcher, markAttendance]);

    // Camera start/stop effect
    useEffect(() => {
        let isCancelled = false;
        if (!isTakingAttendance) {
            stopCamera();
            return;
        }

        const startCamera = async () => {
            setHasCameraPermission(null);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (isCancelled) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setHasCameraPermission(true);
            } catch (error) {
                console.error("Error accessing camera:", error);
                if (isCancelled) return;
                setHasCameraPermission(false);
                setIsTakingAttendance(false);
                toast({
                    variant: 'destructive',
                    title: 'Acceso a la cámara denegado',
                    description: 'Por favor, habilita los permisos de la cámara para pasar lista.',
                });
            }
        };

        startCamera();
        return () => { isCancelled = true; stopCamera(); };
    }, [isTakingAttendance, stopCamera, toast]);

    const handleToggleAttendance = () => {
        if (!isTakingAttendance) {
            setIsTakingAttendance(true);
        } else {
            setIsTakingAttendance(false);

            const now = new Date();
            const dateString = now.toISOString().split('T')[0];

            const studentSchedule = horarios.find(h => h.grupoId === selectedGroup);
            const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
            const todaySchedule = studentSchedule?.schedule?.[dayIndex];

            const updatedList = [...groupStudentList];
            const newAbsenceRecords: Omit<AttendanceRecord, 'id'>[] = [];
            let absencesCount = 0;
            const batch = writeBatch(firestore);

            groupStudentList.forEach(student => {
                if (student.status === 'Pendiente') {
                    absencesCount++;
                    const studentIndex = updatedList.findIndex(s => s.id === student.id);
                    if (studentIndex > -1) {
                        updatedList[studentIndex].status = 'Falta';
                    }

                     if (todaySchedule) {
                        for (const blockIndexStr in todaySchedule) {
                             const block = todaySchedule[parseInt(blockIndexStr)];
                             if (block) {
                                const recordId = `att-${student.id}-${dateString}-${block.materiaId}`;
                                const recordExists = attendance.some(a => a.id === recordId);
                                if (!recordExists) {
                                    const recordRef = doc(firestore, 'attendance', recordId);
                                    batch.set(recordRef, {
                                        studentId: student.id,
                                        date: dateString,
                                        materiaAsignacionId: block.materiaId,
                                        docenteId: block.docenteId,
                                        status: 'Falta',
                                    });
                                }
                             }
                        }
                    }
                }
            });

            setGroupStudentList(updatedList);
            if (absencesCount > 0) {
                 batch.commit().catch(err => {
                    console.error("Error writing absences: ", err);
                    toast({ variant: 'destructive', title: 'Error de Red', description: 'No se pudieron guardar las faltas.' });
                 });
                toast({
                    title: "Pase de lista detenido",
                    description: `${absencesCount} estudiante(s) fueron marcados como 'Falta'.`
                });
            } else {
                 toast({
                    title: "Pase de lista detenido",
                    description: "Todos los estudiantes fueron registrados."
                });
            }
        }
    };

    const handleOpenJustifyDialog = (student: DisplayStudent) => {
        setJustifyingStudent(student);
        setIsJustifyOpen(true);
    };

    const handleJustifySubmit = () => {
        if (!justifyingStudent || !justificationReason) {
             toast({ variant: "destructive", title: "Error", description: "Falta el motivo de la justificación." });
            return;
        }
        
        const attendanceToJustify = attendance.find(a =>
            a.studentId === justifyingStudent?.id &&
            a.status === 'Falta'
        );

        if (!attendanceToJustify || !attendanceToJustify.docenteId) {
             toast({ variant: "destructive", title: "Error", description: "No se encontró un registro de falta válido para justificar." });
            return;
        }

        const newJustificacionData = {
            studentId: justifyingStudent.id,
            date: new Date().toISOString().split('T')[0],
            reason: justificationReason,
            status: 'Pendiente' as 'Pendiente',
            attendanceRecordId: attendanceToJustify.id,
            docenteId: attendanceToJustify.docenteId,
            materiaId: attendanceToJustify.materiaAsignacionId,
        };

        addDoc(collection(firestore, 'justificaciones'), newJustificacionData).catch(err => {
            console.error("Error submitting justification:", err);
            toast({ variant: 'destructive', title: 'Error de Red', description: 'No se pudo enviar la justificación.' });
        });

        toast({
            title: "Justificación Enviada",
            description: `Se ha enviado una justificación para ${justifyingStudent.firstName}.`,
        });

        setIsJustifyOpen(false);
        setJustifyingStudent(null);
        setJustificationReason('');
    };

    const getStatusVariant = (status: DisplayStatus): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Presente': return 'default';
            case 'Retardo': return 'secondary';
            case 'Falta': return 'destructive';
            case 'Falta Justificada': return 'outline';
            case 'Pendiente': return 'outline';
        }
    };

    return (
        <>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pase de Lista por Grupo</CardTitle>
                        <CardDescription>Selecciona un grupo para comenzar a pasar lista.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-3">
                             <div className="grid gap-2">
                                <Label htmlFor="group-select">Grupo</Label>
                                <Select onValueChange={setSelectedGroup} value={selectedGroup || ''} disabled={isTakingAttendance}>
                                    <SelectTrigger id="group-select" className="w-full">
                                        <SelectValue placeholder="Selecciona un grupo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {selectedGroup && (
                    <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Cámara en Vivo</CardTitle>
                                    <CardDescription>
                                        {isTakingAttendance ? 'El sistema está detectando rostros...' : 'Inicia el pase de lista para activar la cámara.'}
                                     </CardDescription>
                                </div>
                                <Button onClick={handleToggleAttendance} size="lg" disabled={!modelsLoaded || !!modelError || (allStudents ?? []).length === 0 || !faceMatcher}>
                                    {isTakingAttendance ? 'Detener Pase de Lista' : 'Iniciar Pase de Lista'}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                                    <video ref={videoRef} className="w-full h-full" autoPlay muted playsInline />
                                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

                                    {!isTakingAttendance && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/50 text-white text-center">
                                            {modelError ? (
                                                <>
                                                    <XCircle className="w-16 h-16 mb-4 text-destructive" />
                                                    <p className="text-lg font-medium">Error al cargar modelos de IA</p>
                                                    <p className="text-sm max-w-md">{modelError}</p>
                                                </>
                                            ) : !modelsLoaded ? (
                                                <>
                                                    <Loader2 className="w-16 h-16 mb-4 animate-spin" />
                                                    <p className="text-lg font-medium">Cargando modelos de IA...</p>
                                                    <p className="text-sm">Esto puede tardar un momento.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="w-16 h-16 mb-4" />
                                                    <p className="text-lg font-medium">La cámara está desactivada</p>
                                                    <p className="text-sm">Haz clic en "Iniciar" para comenzar.</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader>
                                <CardTitle>Registros de Asistencia para {grupos.find(g => g.id === selectedGroup)?.name}</CardTitle>
                                <CardDescription>El estado se actualizará en tiempo real a medida que el sistema reconozca a los estudiantes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Mobile View */}
                                <div className="grid gap-4 md:hidden">
                                    {groupStudentList.map(student => (
                                        <Card key={student.id}>
                                            <CardContent className="p-4 flex flex-col gap-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={student.facialImage || undefined} alt={`${student.firstName} ${student.lastName}`} />
                                                            <AvatarFallback><UserIcon /></AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                                                            <Badge variant={getStatusVariant(student.status)}>{student.status}</Badge>
                                                        </div>
                                                    </div>
                                                    <Button variant="secondary" size="sm" onClick={() => handleOpenJustifyDialog(student)} disabled={student.status !== 'Falta'}>
                                                        <FilePlus className="mr-2 h-3 w-3" />
                                                        Justificar
                                                    </Button>
                                                </div>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <p>Materia: {student.subjectName || 'N/A'}</p>
                                                    <p>Llegada: {student.arrivalTime || 'N/A'}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {/* Desktop View */}
                                <Table className="hidden md:table">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Estudiante</TableHead>
                                            <TableHead>Materia Asignada</TableHead>
                                            <TableHead>Hora de Llegada</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupStudentList.length > 0 ? (
                                            groupStudentList.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={student.facialImage || undefined} alt={`${student.firstName} ${student.lastName}`} />
                                                                <AvatarFallback><UserIcon /></AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{student.firstName} ${student.lastName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{student.subjectName || 'N/A'}</TableCell>
                                                    <TableCell>{student.arrivalTime || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusVariant(student.status)}>{student.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button variant="secondary" size="sm" onClick={() => handleOpenJustifyDialog(student)} disabled={student.status !== 'Falta'}>
                                                            <FilePlus className="mr-2 h-3 w-3" />
                                                            Justificar
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    Este grupo no tiene estudiantes registrados.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}
                 {!selectedGroup && (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-60 rounded-lg border-2 border-dashed">
                        <Group className="w-16 h-16 mb-4"/>
                        <h3 className="text-lg font-semibold">Selecciona un grupo</h3>
                        <p>Elige un grupo del menú de arriba para empezar a pasar lista.</p>
                    </div>
                )}
            </div>

            <Dialog open={isJustifyOpen} onOpenChange={setIsJustifyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Justificar Falta del Docente</DialogTitle>
                        <DialogDescription>
                            Enviar una justificación para {justifyingStudent?.firstName} por su falta.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Motivo de la justificación</Label>
                            <Textarea
                                id="reason"
                                value={justificationReason}
                                onChange={(e) => setJustificationReason(e.target.value)}
                                placeholder="Ej. El alumno notificó una cita médica, etc."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsJustifyOpen(false)}>Cancelar</Button>
                        <Button onClick={handleJustifySubmit}>Enviar Justificación</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
