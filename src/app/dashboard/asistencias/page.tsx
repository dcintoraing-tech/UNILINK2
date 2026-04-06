"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User as UserIcon, Camera, Users, FilePlus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// --- DATA PERSISTENCE & TYPES (useLocalStorage) ---
// This hook remains the same.
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

interface HorarioBlock {
    materiaId: string;
    docenteId: string;
    duracion: 1 | 2;
}
type DaySchedule = { [blockIndex: number]: HorarioBlock | null };
type ScheduleData = { [dayIndex: number]: DaySchedule };
interface Horario {
    id: string;
    grupoId: string;
    schedule: ScheduleData;
}

interface AttendanceConfig {
    toleranceMinutes: number;
    absenceLimitMinutes: number;
}

type AttendanceStatus = 'Presente' | 'Retardo' | 'Falta' | 'Falta Justificada';

interface AttendanceRecord {
    id: string;
    studentId: string;
    date: string;
    materiaAsignacionId: string;
    status: AttendanceStatus;
    arrivalTime?: string;
    studentName?: string; // For local display
    facialImage?: string | null; // For local display
}

interface Justificacion { 
    id: string; 
    studentId: string;
    date: string; 
    reason: string; 
    status: 'Pendiente' | 'Aprobado' | 'Rechazado'; 
    attendanceRecordId: string;
}

// --- UTILITY FUNCTIONS ---
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.map((val, i) => val * vecB[i]).reduce((acc, val) => acc + val, 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
}

const HORAS_BLOQUE_INICIO = ["07:00", "08:00", "09:00", "10:00"];

// --- MAIN COMPONENT ---
export default function TeacherAttendancePage() {
    const { toast } = useToast();
    // --- Local Storage Data ---
    const [allStudents] = useLocalStorage<Student[]>('unilink-students', []);
    const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [config] = useLocalStorage<AttendanceConfig>('unilink-attendance-config', {
        toleranceMinutes: 10,
        absenceLimitMinutes: 30,
    });
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('unilink-attendance', []);
    const [justificaciones, setJustificaciones] = useLocalStorage<Justificacion[]>('unilink-justificaciones', []);
    
    // --- Component State ---
    const [isTakingAttendance, setIsTakingAttendance] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [sessionRecords, setSessionRecords] = useState<AttendanceRecord[]>([]); // Records for this specific session
    const [scanProgress, setScanProgress] = useState(0);

    const [isJustifyOpen, setIsJustifyOpen] = useState(false);
    const [justifyingStudent, setJustifyingStudent] = useState<AttendanceRecord | null>(null);
    const [justificationReason, setJustificationReason] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const lastRecognitionTime = useRef<number>(0);

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
        if (!videoRef.current || allStudents.length === 0 || horarios.length === 0) return;

        const studentsWithEmbeddings = allStudents.filter(s => s.embedding);
        if (studentsWithEmbeddings.length === 0) return;
        
        // Simulate scanning a live face from the stream by picking a random registered student
        const randomIndex = Math.floor(Math.random() * studentsWithEmbeddings.length);
        const simulatedLiveEmbedding = studentsWithEmbeddings[randomIndex].embedding;
        if (!simulatedLiveEmbedding) return;

        let bestMatch: { student: Student | null; similarity: number } = { student: null, similarity: 0 };
        for (const student of allStudents) {
            if (student.embedding) {
                const similarity = cosineSimilarity(simulatedLiveEmbedding, student.embedding);
                if (similarity > bestMatch.similarity) {
                    bestMatch = { student, similarity };
                }
            }
        }
        
        const SIMILARITY_THRESHOLD = 0.95; // High threshold for simulation

        if (bestMatch.student && bestMatch.similarity >= SIMILARITY_THRESHOLD) {
            const student = bestMatch.student;
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];

            if (sessionRecords.some(r => r.studentId === student.id)) {
                return; // Student already marked in this session
            }
            
            const dayIndex = now.getDay();
            if (dayIndex === 0 || dayIndex === 6) return; // No classes on weekends

            const studentSchedule = horarios.find(h => h.grupoId === student.assignedGroupId);
            const todaySchedule = studentSchedule?.schedule?.[dayIndex - 1];
            
            if (!todaySchedule) return; // No schedule for today

            for (const blockIndexStr in todaySchedule) {
                const blockIndex = parseInt(blockIndexStr);
                const block = todaySchedule[blockIndex];
                
                if (!block) continue;

                const horaInicio = HORAS_BLOQUE_INICIO[blockIndex];
                if (!horaInicio) continue;

                const [hours, minutes] = horaInicio.split(':').map(Number);
                const startTime = new Date(now);
                startTime.setHours(hours, minutes, 0, 0);

                const toleranceTime = new Date(startTime);
                toleranceTime.setMinutes(startTime.getMinutes() + config.toleranceMinutes);

                const absenceLimitTime = new Date(startTime);
                absenceLimitTime.setMinutes(startTime.getMinutes() + config.absenceLimitMinutes);
                
                if (now >= startTime && now <= absenceLimitTime) {
                    const status = now <= toleranceTime ? 'Presente' : 'Retardo';
                    
                    const recordId = `att-${student.id}-${dateString}-${block.materiaId}`;

                    if (attendance.some(rec => rec.id === recordId)) {
                        return; // Already has a global record for this class today
                    }

                    const newRecord: AttendanceRecord = {
                        id: recordId,
                        studentId: student.id,
                        date: dateString,
                        materiaAsignacionId: block.materiaId,
                        status: status,
                        // Display-only fields
                        arrivalTime: now.toLocaleTimeString(),
                        studentName: `${student.firstName} ${student.lastName}`,
                        facialImage: student.facialImage,
                    };
                    
                    setSessionRecords(prev => [...prev, newRecord]);
                    setAttendance(prev => [...prev, {
                        id: newRecord.id,
                        studentId: newRecord.studentId,
                        date: newRecord.date,
                        materiaAsignacionId: newRecord.materiaAsignacionId,
                        status: newRecord.status
                    }]);

                    toast({
                        title: `Asistencia Registrada (${status})`,
                        description: `${newRecord.studentName} ha sido marcado a las ${newRecord.arrivalTime}.`,
                    });
                    break; // Stop after first valid check-in
                }
            }
        }
    }, [allStudents, horarios, config, sessionRecords, attendance, setAttendance, toast]);
    
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
    
    // Recognition interval effect
    useEffect(() => {
        if (!isTakingAttendance || hasCameraPermission !== true) return;
        
        const recognitionInterval = setInterval(() => {
            const now = Date.now();
            if (now - lastRecognitionTime.current > 2000) { // Scan every 2 seconds
                 handleRecognition();
                 lastRecognitionTime.current = now;
            }
        }, 500);
        
        const progressInterval = setInterval(() => {
            setScanProgress(prev => (prev >= 100 ? 0 : prev + 5));
        }, 100);

        return () => { clearInterval(recognitionInterval); clearInterval(progressInterval); setScanProgress(0); };
    }, [isTakingAttendance, hasCameraPermission, handleRecognition]);

    const handleToggleAttendance = () => {
        if (!isTakingAttendance) {
            setSessionRecords([]);
        }
        setIsTakingAttendance(prev => !prev);
    };

    const handleOpenJustifyDialog = (student: AttendanceRecord) => {
        setJustifyingStudent(student);
        setIsJustifyOpen(true);
    };

    const handleJustifySubmit = () => {
        if (!justifyingStudent || !justificationReason) {
             toast({ variant: "destructive", title: "Error", description: "El motivo de la justificación es obligatorio." });
            return;
        }
        
        const newJustificacion: Justificacion = {
            id: `just-${justifyingStudent.studentId}-${new Date().toISOString()}`,
            studentId: justifyingStudent.studentId,
            date: new Date().toISOString().split('T')[0],
            reason: justificationReason,
            status: 'Pendiente',
            attendanceRecordId: justifyingStudent.id, // Link to the attendance record
        };

        setJustificaciones(prev => [...prev, newJustificacion]);
        toast({
            title: "Justificación Enviada",
            description: `Se ha enviado una justificación para ${justifyingStudent.studentName}.`,
        });

        setIsJustifyOpen(false);
        setJustifyingStudent(null);
        setJustificationReason('');
    };

    const getStatusVariant = (status: AttendanceStatus): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Presente': return 'default';
            case 'Retardo': return 'secondary';
            case 'Falta': return 'destructive';
            case 'Falta Justificada': return 'outline';
        }
    };
    
    const renderCameraState = () => {
        if (allStudents.length === 0) {
             return (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Users className="w-16 h-16" />
                    <p>No hay estudiantes registrados para pasar lista.</p>
                </div>
            );
        }
        if (!isTakingAttendance) {
            return (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Camera className="w-16 h-16" />
                    <p>La cámara está desactivada. Haz clic en "Iniciar" para comenzar.</p>
                </div>
            );
        }
        if (hasCameraPermission === null) return <p>Solicitando permiso de la cámara...</p>;
        if (hasCameraPermission === false) {
             return (
                <Alert variant="destructive" className="max-w-md">
                    <AlertTitle>Acceso a Cámara Requerido</AlertTitle>
                    <AlertDescription>No se puede pasar lista sin acceso a la cámara.</AlertDescription>
                </Alert>
            );
        }
        return null;
    };

    return (
        <>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Pase de Lista por Reconocimiento Facial</CardTitle>
                                <CardDescription>Inicia el proceso para marcar la asistencia de los estudiantes.</CardDescription>
                            </div>
                            <Button onClick={handleToggleAttendance} size="lg" disabled={allStudents.length === 0}>
                                {isTakingAttendance ? 'Detener Pase de Lista' : 'Iniciar Pase de Lista'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                            <video ref={videoRef} className={cn("w-full h-full object-cover", (!isTakingAttendance || hasCameraPermission !== true) && "hidden")} autoPlay muted playsInline />
                            <div className={cn("absolute inset-0 flex items-center justify-center p-4", isTakingAttendance && hasCameraPermission ? 'hidden' : 'flex')}>
                                {renderCameraState()}
                            </div>
                            {isTakingAttendance && hasCameraPermission && (
                                <div className="absolute bottom-4 left-4 right-4">
                                    <Progress value={scanProgress} />
                                    <p className="text-center text-sm text-white font-medium mt-2" style={{textShadow: '0 0 5px black'}}>Escaneando...</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Registros de Asistencia de esta Sesión ({sessionRecords.length})</CardTitle>
                        <CardDescription>Estudiantes identificados durante esta sesión de pase de lista.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sessionRecords.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {sessionRecords.map(record => (
                                    <div key={record.studentId} className="flex flex-col items-center text-center gap-2 p-2 rounded-lg border">
                                        <Avatar className="w-20 h-20 border-2" style={{ borderColor: record.status === 'Presente' ? 'hsl(var(--primary))' : 'hsl(var(--secondary))' }}>
                                            <AvatarImage src={record.facialImage || undefined} alt={record.studentName} />
                                            <AvatarFallback><UserIcon /></AvatarFallback>
                                        </Avatar>
                                        <p className="text-sm font-medium leading-tight">{record.studentName}</p>
                                        <div className='text-xs text-muted-foreground'>{record.arrivalTime}</div>
                                        <Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
                                        <Button variant="outline" size="sm" className="mt-2" onClick={() => handleOpenJustifyDialog(record)}>
                                            <FilePlus className="mr-2 h-3 w-3" />
                                            Justificar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-40">
                                <Users className="w-12 h-12 mb-4"/>
                                <p>Esperando el primer registro de asistencia...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isJustifyOpen} onOpenChange={setIsJustifyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Justificar Asistencia</DialogTitle>
                        <DialogDescription>
                            Enviar una justificación para {justifyingStudent?.studentName} para la fecha de hoy.
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
    