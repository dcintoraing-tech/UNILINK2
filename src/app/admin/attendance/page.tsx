"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User as UserIcon, Camera, Users, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
    duracion: string; // "1" or "2"
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

interface AttendanceRecord {
    studentId: string;
    studentName: string;
    facialImage: string | null;
    arrivalTime: string;
    status: 'Presente' | 'Retardo';
}

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
export default function AttendancePage() {
    const { toast } = useToast();
    const [allStudents] = useLocalStorage<Student[]>('unilink-students', []);
    const [horarios] = useLocalStorage<Horario[]>('unilink-horarios', []);
    const [config] = useLocalStorage<AttendanceConfig>('unilink-attendance-config', {
        toleranceMinutes: 10,
        absenceLimitMinutes: 30,
    });
    
    const [isTakingAttendance, setIsTakingAttendance] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [scanProgress, setScanProgress] = useState(0);

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
        
        const SIMILARITY_THRESHOLD = 0.95;

        if (bestMatch.student && bestMatch.similarity >= SIMILARITY_THRESHOLD) {
            const student = bestMatch.student;
            const now = new Date();

            if (attendanceRecords.some(r => r.studentId === student.id)) {
                return; // Student already marked
            }

            const studentSchedule = horarios.find(h => h.grupoId === student.assignedGroupId && h.dia === DIAS_SEMANA[now.getDay()]);

            if (!studentSchedule) {
                // No schedule for today, maybe show a toast in a real scenario
                return;
            }

            let checkedIn = false;
            for (const block of studentSchedule.blocks) {
                if (!block) continue;

                const [hours, minutes] = block.horaInicio.split(':').map(Number);
                const startTime = new Date(now);
                startTime.setHours(hours, minutes, 0, 0);

                const toleranceTime = new Date(startTime);
                toleranceTime.setMinutes(startTime.getMinutes() + config.toleranceMinutes);

                const absenceLimitTime = new Date(startTime);
                absenceLimitTime.setMinutes(startTime.getMinutes() + config.absenceLimitMinutes);
                
                // Check if current time is within a valid check-in window for any block
                if (now >= startTime && now <= absenceLimitTime) {
                    const status = now <= toleranceTime ? 'Presente' : 'Retardo';
                    const newRecord: AttendanceRecord = {
                        studentId: student.id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        facialImage: student.facialImage,
                        arrivalTime: now.toLocaleTimeString(),
                        status: status
                    };

                    setAttendanceRecords(prev => [...prev, newRecord]);
                    toast({
                        title: `Asistencia Registrada (${status})`,
                        description: `${newRecord.studentName} ha sido marcado a las ${newRecord.arrivalTime}.`,
                    });
                    checkedIn = true;
                    break; // Stop after first valid check-in
                }
            }
        }
    }, [allStudents, horarios, config, attendanceRecords, toast]);

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
        if (!isTakingAttendance) setAttendanceRecords([]);
        setIsTakingAttendance(prev => !prev);
    };

    const getStatusVariant = (status: 'Presente' | 'Retardo'): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Presente': return 'default';
            case 'Retardo': return 'secondary';
            default: return 'outline';
        }
    };

    const renderCameraState = () => {
        if (allStudents.length === 0) {
             return (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Users className="w-16 h-16" />
                    <p>No hay estudiantes registrados para pasar lista.</p>
                    <Link href="/admin/students"><Button>Registrar Estudiantes</Button></Link>
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
                            <CardTitle>Pase de Lista por Reconocimiento Facial</CardTitle>
                            <CardDescription>Inicia el proceso para marcar la asistencia de los estudiantes.</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                             <Link href="/admin/dashboard" passHref><Button variant="outline" size="lg"><ArrowLeft className="mr-2 h-4 w-4" />Regresar</Button></Link>
                            <Button onClick={handleToggleAttendance} size="lg" disabled={allStudents.length === 0}>
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
                    <CardTitle>Registros de Asistencia ({attendanceRecords.length})</CardTitle>
                    <CardDescription>Estudiantes identificados en esta sesión.</CardDescription>
                </CardHeader>
                <CardContent>
                    {attendanceRecords.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {attendanceRecords.map(record => (
                                <div key={record.studentId} className="flex flex-col items-center text-center gap-2">
                                     <Avatar className="w-20 h-20 border-2" style={{ borderColor: record.status === 'Presente' ? 'hsl(var(--primary))' : 'hsl(var(--secondary))' }}>
                                        <AvatarImage src={record.facialImage || undefined} alt={record.studentName} />
                                        <AvatarFallback><UserIcon /></AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium leading-tight">{record.studentName}</p>
                                    <div className='text-xs text-muted-foreground'>{record.arrivalTime}</div>
                                    <Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
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
