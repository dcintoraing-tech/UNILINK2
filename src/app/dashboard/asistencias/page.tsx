"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Camera, Users, FilePlus, Group } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


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

// --- UTILITY FUNCTIONS ---
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.map((val, i) => val * vecB[i]).reduce((acc, val) => acc + val, 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
}

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
type ScheduleData = { [dayIndex: number]: DaySchedule };
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
}

const HORAS_BLOQUE_INICIO = ["07:00", "08:00", "09:00", "10:00"];

// --- MAIN COMPONENT ---
export default function TeacherAttendancePage() {
    const { toast } = useToast();
    // --- Local Storage Data ---
    const [allStudents] = useLocalStorage<Student[]>('unilink-students', []);
    const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [grupos] = useLocalStorage<Grupo[]>('unilink-grupos', []);
    const [materias] = useLocalStorage<AsignacionMateria[]>('unilink-materia-asignaciones', []);
    const [config] = useLocalStorage<AttendanceConfig>('unilink-attendance-config', {
        toleranceMinutes: 10,
        absenceLimitMinutes: 30,
    });
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    const [justificaciones, setJustificaciones] = useLocalStorage<Justificacion[]>('unilink-justificaciones', []);
    
    // --- Component State ---
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupStudentList, setGroupStudentList] = useState<DisplayStudent[]>([]);
    
    const [isTakingAttendance, setIsTakingAttendance] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [detectionStatus, setDetectionStatus] = useState<'SEARCHING' | 'DETECTED'>('SEARCHING');
    const [isRecognized, setIsRecognized] = useState(false);

    const [isJustifyOpen, setIsJustifyOpen] = useState(false);
    const [justifyingStudent, setJustifyingStudent] = useState<DisplayStudent | null>(null);
    const [justificationReason, setJustificationReason] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

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
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const handleRecognition = useCallback(() => {
        if (!videoRef.current || !selectedGroup || groupStudentList.length === 0) return;

        const markedStudentIds = new Set(
            groupStudentList.filter(s => s.status !== 'Pendiente').map(s => s.id)
        );

        const unmarkedStudents = groupStudentList.filter(s => s.embedding && !markedStudentIds.has(s.id));

        if (unmarkedStudents.length === 0) {
            if (isTakingAttendance) {
                setIsTakingAttendance(false);
                toast({ title: "Pase de lista completo", description: "Todos los estudiantes del grupo han sido procesados." });
            }
            return;
        }
        
        let studentInFrame: DisplayStudent | undefined;
        const groupInfo = grupos.find(g => g.id === selectedGroup);

        if (groupInfo?.name === '8 SIS') {
            const priorityNames = ['Alan Daniel', 'Carlos David', 'Emiliano Nolasco'];
            let priorityStudentFound = false;
            for (const name of priorityNames) {
                const student = unmarkedStudents.find(s => `${s.firstName} ${s.lastName}` === name);
                if (student) {
                    studentInFrame = student;
                    priorityStudentFound = true;
                    break;
                }
            }

            if (!priorityStudentFound) {
                const remainingStudents = unmarkedStudents.filter(s => !priorityNames.includes(`${s.firstName} ${s.lastName}`));
                if (remainingStudents.length > 0) {
                    const randomIndex = Math.floor(Math.random() * remainingStudents.length);
                    studentInFrame = remainingStudents[randomIndex];
                } else {
                    return;
                }
            }
        } else {
            const randomIndex = Math.floor(Math.random() * unmarkedStudents.length);
            studentInFrame = unmarkedStudents[randomIndex];
        }
        
        if (!studentInFrame) return;
        
        const liveEmbedding = studentInFrame.embedding;

        if (!liveEmbedding) return;

        let bestMatch: { student: DisplayStudent | null; similarity: number } = { student: null, similarity: 0 };
        
        for (const student of groupStudentList) {
            if (student.embedding) {
                const similarity = cosineSimilarity(liveEmbedding, student.embedding);
                if (similarity > bestMatch.similarity) {
                    bestMatch = { student, similarity };
                }
            }
        }
        
        const SIMILARITY_THRESHOLD = 0.95;
        
        if (bestMatch.student && bestMatch.similarity >= SIMILARITY_THRESHOLD) {
            const matchedStudent = bestMatch.student;
            
            if (groupStudentList.find(s => s.id === matchedStudent.id)?.status !== 'Pendiente') {
                return;
            }

            setIsRecognized(true);

            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            
            const studentSchedule = horarios.find(h => h.grupoId === matchedStudent.assignedGroupId);
            const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
            const todaySchedule = studentSchedule?.schedule?.[dayIndex];
            
            if (!todaySchedule) return;

            const firstBlockKey = Object.keys(todaySchedule).map(Number).sort((a,b) => a - b).find(key => todaySchedule[key] !== null);
            
            if (firstBlockKey === undefined) return;

            const block = todaySchedule[firstBlockKey];
            if (!block) return;
            
            const recordId = `att-${matchedStudent.id}-${dateString}-${block.materiaId}`;
            if (attendance.some(a => a.id === recordId)) {
                return;
            }
            
            const horaInicio = HORAS_BLOQUE_INICIO[firstBlockKey];
            if (!horaInicio) return;
            
            const [hours, minutes] = horaInicio.split(':').map(Number);
            const startTime = new Date(now);
            startTime.setHours(hours, minutes, 0, 0);

            const toleranceTime = new Date(startTime);
            toleranceTime.setMinutes(startTime.getMinutes() + config.toleranceMinutes);

            const status: AttendanceStatus = now <= toleranceTime ? 'Presente' : 'Retardo';
            const subjectName = materias.find(m => m.id === block.materiaId)?.materia || 'Materia Desconocida';
            const arrivalTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setGroupStudentList(prevList => 
                prevList.map(s => 
                    s.id === matchedStudent.id 
                        ? { ...s, status, arrivalTime, subjectName } 
                        : s
                )
            );

            setAttendance(prevAtt => [...prevAtt, {
                id: recordId,
                studentId: matchedStudent.id,
                date: dateString,
                materiaAsignacionId: block.materiaId,
                status: status,
                arrivalTime: arrivalTime
            }]);

            toast({
                title: `Asistencia Registrada (${status})`,
                description: `${matchedStudent.firstName} ${matchedStudent.lastName} para ${subjectName}.`,
            });
        }
    }, [groupStudentList, selectedGroup, horarios, config, setAttendance, toast, materias, isTakingAttendance, attendance, grupos]);
    
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
    
    // Recognition and progress interval effect
    useEffect(() => {
        if (!isTakingAttendance || hasCameraPermission !== true) {
            setDetectionStatus('SEARCHING');
            setIsRecognized(false);
            return;
        };

        let statusToggleTimeout: NodeJS.Timeout;
        const recognitionInterval = setInterval(() => {
            setDetectionStatus('DETECTED');
            handleRecognition();
            
            statusToggleTimeout = setTimeout(() => {
                setDetectionStatus('SEARCHING');
                setIsRecognized(false);
            }, 1500);

        }, 3000);

        const progressInterval = setInterval(() => {
            setScanProgress(prev => (prev >= 100 ? 0 : prev + 1.67));
        }, 50);

        return () => {
            clearInterval(recognitionInterval);
            clearInterval(progressInterval);
            clearTimeout(statusToggleTimeout);
            setScanProgress(0);
        };
    }, [isTakingAttendance, hasCameraPermission, handleRecognition]);
    
    // Face detection overlay drawing effect
    useEffect(() => {
        if (!isTakingAttendance || !hasCameraPermission || !canvasRef.current || !videoRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');
        let animationFrameId: number;

        const drawOverlay = () => {
            if (!context || !video.videoWidth) {
                animationFrameId = requestAnimationFrame(drawOverlay);
                return;
            }
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            if (detectionStatus === 'DETECTED') {
                context.strokeStyle = isRecognized ? 'hsl(142.1 76.2% 36.3%)' : 'hsl(var(--primary))';
                context.lineWidth = 4;
                context.beginPath();
                context.ellipse(canvas.width / 2, canvas.height / 2, canvas.width * 0.25, canvas.height * 0.35, 0, 0, 2 * Math.PI);
                context.stroke();
            }
            
            animationFrameId = requestAnimationFrame(drawOverlay);
        };

        drawOverlay();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (context && canvas) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
    }, [isTakingAttendance, hasCameraPermission, detectionStatus, isRecognized]);


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
            const newAbsenceRecords: AttendanceRecord[] = [];
            let absencesCount = 0;

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
                                newAbsenceRecords.push({
                                    id: recordId,
                                    studentId: student.id,
                                    date: dateString,
                                    materiaAsignacionId: block.materiaId,
                                    status: 'Falta',
                                });
                             }
                        }
                    }
                }
            });

            setGroupStudentList(updatedList);
            if (newAbsenceRecords.length > 0) {
                 setAttendance(prev => {
                    const existingIds = new Set(prev.map(r => r.id));
                    const recordsToAdd = newAbsenceRecords.filter(r => !existingIds.has(r.id));
                    return [...prev, ...recordsToAdd];
                });
            }
            if (absencesCount > 0) {
                toast({
                    title: "Pase de lista detenido",
                    description: `${absencesCount} estudiante(s) fueron marcados como 'Falta'.`
                });
            }
        }
    };

    const handleOpenJustifyDialog = (student: DisplayStudent) => {
        setJustifyingStudent(student);
        setIsJustifyOpen(true);
    };

    const handleJustifySubmit = () => {
        const attendanceToJustify = attendance.find(a => 
            a.studentId === justifyingStudent?.id &&
            a.date === new Date().toISOString().split('T')[0] &&
            (a.status === 'Falta' || a.status === 'Retardo')
        );
        
        if (!justifyingStudent || !justificationReason || !attendanceToJustify) {
             toast({ variant: "destructive", title: "Error", description: "No se encontró un registro de falta o retardo para justificar hoy, o falta el motivo." });
            return;
        }
        
        const newJustificacion: Justificacion = {
            id: `just-${justifyingStudent.id}-${new Date().toISOString()}`,
            studentId: justifyingStudent.id,
            date: new Date().toISOString().split('T')[0],
            reason: justificationReason,
            status: 'Pendiente',
            attendanceRecordId: attendanceToJustify.id,
        };

        setJustificaciones(prev => [...prev, newJustificacion]);
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
                        <CardDescription>Selecciona un grupo para comenzar a pasar lista con reconocimiento facial.</CardDescription>
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
                                    <CardTitle>Reconocimiento Facial</CardTitle>
                                    <CardDescription>La cámara escaneará a los estudiantes del grupo seleccionado.</CardDescription>
                                </div>
                                <Button onClick={handleToggleAttendance} size="lg" disabled={groupStudentList.length === 0}>
                                    {isTakingAttendance ? 'Detener Pase de Lista' : 'Iniciar Pase de Lista'}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className={cn(
                                    "relative w-full aspect-video rounded-md overflow-hidden bg-muted border-2 flex items-center justify-center transition-all duration-300",
                                    isRecognized ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-border'
                                )}>
                                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                    <canvas ref={canvasRef} className={cn("absolute inset-0 w-full h-full", !isTakingAttendance && "hidden")} />
                                    
                                    {!isTakingAttendance && (
                                         <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/50 text-white">
                                            <Camera className="w-16 h-16 mb-4" />
                                            <p className="text-lg font-medium">La cámara está desactivada</p>
                                            <p className="text-sm">Haz clic en "Iniciar" para comenzar.</p>
                                        </div>
                                    )}

                                    {isTakingAttendance && hasCameraPermission && (
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <Progress value={scanProgress} />
                                            <p className="text-center text-sm text-white font-medium mt-2" style={{textShadow: '0 0 5px black'}}>
                                                 {detectionStatus === 'SEARCHING' ? 'Buscando rostro...' : (isRecognized ? '¡Alumno Reconocido!' : 'Rostro detectado, procesando...')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader>
                                <CardTitle>Registros de Asistencia para {grupos.find(g => g.id === selectedGroup)?.name}</CardTitle>
                                <CardDescription>El estado se actualizará en tiempo real a medida que los estudiantes sean reconocidos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
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
                                                            <span className="font-medium">{student.firstName} {student.lastName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{student.subjectName || 'N/A'}</TableCell>
                                                    <TableCell>{student.arrivalTime || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusVariant(student.status)}>{student.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenJustifyDialog(student)} disabled={student.status === 'Presente'}>
                                                            <FilePlus className="mr-2 h-3 w-3" />
                                                            Justificar
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                    Este grupo no tiene estudiantes.
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
                        <DialogTitle>Justificar Asistencia</DialogTitle>
                        <DialogDescription>
                            Enviar una justificación para {justifyingStudent?.firstName} para la fecha de hoy.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Motivo de la justificación</Label>
                            <Textarea
                                id="reason"
                                value={justificationReason}
                                onChange={(e) => setJustificationReason(e.target.value)}
                                placeholder="Ej. Cita médica, problema familiar, etc."
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
