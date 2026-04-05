"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User as UserIcon, Camera, Users, ArrowLeft, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
    docenteId: string;
    materiaAsignacionId: string;
    horaInicio: string;
    duracion: string; 
}

interface Horario {
    id: string;
    grupoId: string;
    dia: string;
    blocks: (HorarioBlock | undefined)[];
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
}

interface UIAttendanceRecord {
    studentId: string;
    studentName: string;
    facialImage: string | null;
    arrivalTime: string;
    status: AttendanceStatus;
}
interface Justificacion { id: string; studentId: string; date: string; reason: string; status: 'Pendiente' | 'Aprobado' | 'Rechazado'; attendanceRecordId: string; }

interface User { id: string, name: string, role: string }


// --- UTILITY FUNCTIONS ---
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.map((val, i) => val * vecB[i]).reduce((acc, val) => acc + val, 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
}

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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
    
    // --- User & Role State ---
    const [user, setUser] = useState<User | null>(null);
    const [activeRole, setActiveRole] = useState('');

    // --- Component State ---
    const [isTakingAttendance, setIsTakingAttendance] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [uiAttendanceRecords, setUIAttendanceRecords] = useState<UIAttendanceRecord[]>([]);
    const [scanProgress, setScanProgress] = useState(0);
    const [justificationText, setJustificationText] = useState('');
    const [justifyingStudent, setJustifyingStudent] = useState<UIAttendanceRecord | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const lastRecognitionTime = useRef<number>(0);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = sessionStorage.getItem('unilink-user');
            const storedRole = sessionStorage.getItem('unilink-active-role');
            if (storedUser) setUser(JSON.parse(storedUser));
            if (storedRole) setActiveRole(storedRole);
        }
    }, []);

    const studentsForTeacher = useMemo(() => {
        if (activeRole === 'Super Docente') return allStudents;
        if (activeRole === 'Docente' && user) {
            const teacherGroupIds = new Set<string>();
            horarios.forEach(h => {
                h.blocks.forEach(b => {
                    if (b?.docenteId === user.id) teacherGroupIds.add(h.grupoId);
                })
            });
            return allStudents.filter(s => teacherGroupIds.has(s.assignedGroupId));
        }
        return [];
    }, [activeRole, user, allStudents, horarios]);

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
        if (!videoRef.current || studentsForTeacher.length === 0 || horarios.length === 0) return;

        const studentsWithEmbeddings = studentsForTeacher.filter(s => s.embedding);
        if (studentsWithEmbeddings.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * studentsWithEmbeddings.length);
        const simulatedLiveEmbedding = studentsWithEmbeddings[randomIndex].embedding;
        if (!simulatedLiveEmbedding) return;

        let bestMatch: { student: Student | null; similarity: number } = { student: null, similarity: 0 };
        for (const student of studentsForTeacher) {
            if (student.embedding) {
                const similarity = cosineSimilarity(simulatedLiveEmbedding, student.embedding);
                if (similarity > bestMatch.similarity) {
                    bestMatch = { student, similarity };
                }
            }
        }
        
        const SIMILARITY_THRESHOLD = 0.95;

        if (bestMatch.student && bestMatch.similarity >= SIMILARITY_THRESHOLD) {
            const student = bestMatch.student;
            const now = new Date();

            if (uiAttendanceRecords.some(r => r.studentId === student.id)) {
                return;
            }

            const studentSchedule = horarios.find(h => h.grupoId === student.assignedGroupId && h.dia === DIAS_SEMANA[now.getDay()]);

            if (!studentSchedule) return;

            let checkedIn = false;
            for (const block of studentSchedule.blocks) {
                if (!block) continue;
                if (activeRole === 'Docente' && user && block.docenteId !== user.id) continue;

                const [hours, minutes] = block.horaInicio.split(':').map(Number);
                const startTime = new Date(now);
                startTime.setHours(hours, minutes, 0, 0);

                const toleranceTime = new Date(startTime);
                toleranceTime.setMinutes(startTime.getMinutes() + config.toleranceMinutes);

                const absenceLimitTime = new Date(startTime);
                absenceLimitTime.setMinutes(startTime.getMinutes() + config.absenceLimitMinutes);
                
                if (now >= startTime && now <= absenceLimitTime) {
                    const status = now <= toleranceTime ? 'Presente' : 'Retardo';
                    const newUIRecord: UIAttendanceRecord = {
                        studentId: student.id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        facialImage: student.facialImage,
                        arrivalTime: now.toLocaleTimeString(),
                        status: status
                    };

                    setUIAttendanceRecords(prev => [...prev, newUIRecord]);

                    const dateString = now.toISOString().split('T')[0];
                    const recordId = `att-${student.id}-${dateString}-${block.materiaAsignacionId}`;
                    const newPersistedRecord: AttendanceRecord = {
                        id: recordId,
                        studentId: student.id,
                        date: dateString,
                        materiaAsignacionId: block.materiaAsignacionId,
                        status: status,
                    };
                    
                    setAttendance(prevAttendance => {
                        const existingIndex = prevAttendance.findIndex(r => r.id === recordId);
                        const updated = [...prevAttendance];
                        if (existingIndex > -1) {
                            updated[existingIndex] = newPersistedRecord;
                        } else {
                            updated.push(newPersistedRecord);
                        }
                        return updated;
                    });
                    
                    toast({
                        title: `Asistencia Registrada (${status})`,
                        description: `${newUIRecord.studentName} ha sido marcado a las ${newUIRecord.arrivalTime}.`,
                    });
                    checkedIn = true;
                    break;
                }
            }
        }
    }, [studentsForTeacher, horarios, config, uiAttendanceRecords, toast, setAttendance, user, activeRole]);

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
    
    useEffect(() => {
        if (!isTakingAttendance || hasCameraPermission !== true) return;
        const recognitionInterval = setInterval(() => {
            const now = Date.now();
            if (now - lastRecognitionTime.current > 2000) {
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
        if (!isTakingAttendance) setUIAttendanceRecords([]);
        setIsTakingAttendance(prev => !prev);
    };

    const handleSaveJustification = () => {
        if (!justifyingStudent || !justificationText.trim()) return;

        const dateString = new Date().toISOString().split('T')[0];
        
        const attendanceRecordForJustification = attendance.find(a => 
            a.studentId === justifyingStudent.studentId && 
            a.date === dateString &&
            a.status === 'Falta' // Or maybe any status? For now, only 'Falta'
        );
        
        // This is a simplification. A real app would need to find the correct class/block.
        const materiaAsignacionId = attendanceRecordForJustification?.materiaAsignacionId || 'unknown';
        const attendanceRecordId = attendanceRecordForJustification?.id || `att-justified-${justifyingStudent.studentId}-${Date.now()}`;
        
        const newJustification: Justificacion = {
            id: `just-${Date.now()}`,
            studentId: justifyingStudent.studentId,
            date: dateString,
            reason: justificationText,
            status: 'Pendiente',
            attendanceRecordId: attendanceRecordId,
        };
        setJustificaciones(prev => [...prev, newJustification]);
        
        setJustifyingStudent(null);
        setJustificationText('');
        toast({ title: 'Justificación guardada', description: 'La justificación ha sido enviada para su revisión.' });
    };

    const getStatusVariant = (status: AttendanceStatus): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Presente': return 'default';
            case 'Retardo': return 'secondary';
            case 'Falta': return 'destructive';
            case 'Falta Justificada': return 'outline';
            default: return 'outline';
        }
    };

    const renderCameraState = () => {
        if (studentsForTeacher.length === 0) {
             return (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Users className="w-16 h-16" />
                    <p>No hay estudiantes para pasar lista.</p>
                     {activeRole !== 'Super Docente' && <p className="text-sm">Asegúrate de tener grupos y alumnos asignados.</p>}
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
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Pase de Lista Inteligente</CardTitle>
                            <CardDescription>Inicia la cámara para registrar la asistencia de tus estudiantes.</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                             <Link href="/dashboard" passHref><Button variant="outline" size="lg"><ArrowLeft className="mr-2 h-4 w-4" />Regresar</Button></Link>
                            <Button onClick={handleToggleAttendance} size="lg" disabled={studentsForTeacher.length === 0}>
                                {isTakingAttendance ? 'Detener Pase de Lista' : 'Iniciar Pase de Lista'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                        <video ref={videoRef} className={cn("w-full h-full object-cover", !isTakingAttendance && "hidden")} autoPlay muted playsInline />
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
                    <CardTitle>Registros de Asistencia ({uiAttendanceRecords.length})</CardTitle>
                    <CardDescription>Estudiantes identificados en esta sesión.</CardDescription>
                </CardHeader>
                <CardContent>
                    {uiAttendanceRecords.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {uiAttendanceRecords.map(record => (
                                <div key={record.studentId} className="flex flex-col items-center text-center gap-2">
                                     <Avatar className="w-20 h-20 border-2" style={{ borderColor: record.status === 'Presente' ? 'hsl(var(--primary))' : 'hsl(var(--secondary))' }}>
                                        <AvatarImage src={record.facialImage || undefined} alt={record.studentName} />
                                        <AvatarFallback><UserIcon /></AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium leading-tight">{record.studentName}</p>
                                    <div className='text-xs text-muted-foreground'>{record.arrivalTime}</div>
                                    <Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
                                    <Dialog onOpenChange={(open) => !open && setJustifyingStudent(null)}>
                                        <DialogTrigger asChild>
                                            <Button variant="link" size="sm" onClick={() => setJustifyingStudent(record)}>Justificar</Button>
                                        </DialogTrigger>
                                        {justifyingStudent?.studentId === record.studentId && (
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Justificar Falta</DialogTitle>
                                                    <DialogDescription>Agrega un motivo para la ausencia de {justifyingStudent.studentName}. Esto se enviará para aprobación.</DialogDescription>
                                                </DialogHeader>
                                                <Textarea placeholder="Ej. Cita médica, problema familiar..." value={justificationText} onChange={(e) => setJustificationText(e.target.value)} />
                                                <DialogFooter>
                                                    <Button onClick={handleSaveJustification}>Guardar Justificación</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        )}
                                    </Dialog>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-40">
                            <Users className="w-12 h-12 mb-4"/>
                            <p>Aún no se ha registrado ninguna asistencia.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
