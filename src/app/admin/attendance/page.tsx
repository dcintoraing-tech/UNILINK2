"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User as UserIcon, Camera, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';


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

interface AttendanceRecord {
    studentId: string;
    studentName: string;
    facialImage: string | null;
    arrivalTime: string;
    status: 'Presente' | 'Retardo';
    materiaId: string;
    docenteId: string;
    date: string;
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
    const firestore = useFirestore();

    const { data: allStudents } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: horarios } = useCollection<Horario>(useMemoFirebase(() => collection(firestore, 'horarios'), [firestore]));
    const { data: configData } = useDoc<AttendanceConfig>(useMemoFirebase(() => doc(firestore, 'config', 'attendance'), [firestore]));
    
    const config = configData || { toleranceMinutes: 10, absenceLimitMinutes: 30 };
    
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
    
    const handleRecognition = useCallback(async () => {
        if (!videoRef.current || !allStudents || allStudents.length === 0 || !horarios || horarios.length === 0) return;

        const studentsWithEmbeddings = allStudents.filter(s => s.embedding);
        if (studentsWithEmbeddings.length === 0) return;
        
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

            if (attendanceRecords.some(r => r.studentId === student.id)) return;

            const studentSchedule = horarios.find(h => h.grupoId === student.assignedGroupId && DIAS_SEMANA[now.getDay()] && h.schedule[now.getDay() - 1]);
            if (!studentSchedule) return;

            const daySchedule = studentSchedule.schedule[now.getDay() - 1];
            if (!daySchedule) return;

            for (const block of Object.values(daySchedule)) {
                if (!block) continue;
                
                const horaInicioStr = ["07:00", "08:00", "09:00", "10:00"][Object.keys(daySchedule).findIndex(k => daySchedule[parseInt(k)] === block)];
                if(!horaInicioStr) continue;

                const [hours, minutes] = horaInicioStr.split(':').map(Number);
                const startTime = new Date(now);
                startTime.setHours(hours, minutes, 0, 0);

                const toleranceTime = new Date(startTime);
                toleranceTime.setMinutes(startTime.getMinutes() + config.toleranceMinutes);

                const absenceLimitTime = new Date(startTime);
                absenceLimitTime.setMinutes(startTime.getMinutes() + config.absenceLimitMinutes);
                
                if (now >= startTime && now <= absenceLimitTime) {
                    const status = now <= toleranceTime ? 'Presente' : 'Retardo';
                    const dateString = now.toISOString().split('T')[0];
                    const recordId = `att-${student.id}-${dateString}-${block.materiaId}`;

                    const newRecord: AttendanceRecord = {
                        studentId: student.id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        facialImage: student.facialImage,
                        arrivalTime: now.toLocaleTimeString(),
                        status: status,
                        materiaId: block.materiaId,
                        docenteId: block.docenteId,
                        date: dateString,
                    };

                    setAttendanceRecords(prev => [...prev, newRecord]);
                    
                    try {
                        await setDoc(doc(firestore, 'attendance', recordId), {
                            studentId: newRecord.studentId,
                            date: newRecord.date,
                            materiaAsignacionId: newRecord.materiaId,
                            docenteId: newRecord.docenteId,
                            status: newRecord.status,
                            arrivalTime: newRecord.arrivalTime,
                        });

                        toast({
                            title: `Asistencia Registrada (${status})`,
                            description: `${newRecord.studentName} ha sido marcado a las ${newRecord.arrivalTime}.`,
                        });
                    } catch (error) {
                        console.error("Error saving attendance:", error);
                        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la asistencia en la base de datos.'});
                    }

                    break;
                }
            }
        }
    }, [allStudents, horarios, config, attendanceRecords, toast, firestore]);

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
        if (!allStudents || allStudents.length === 0) {
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
        if (hasCameraPermission === null) return <div className='flex items-center gap-2'><Loader2 className='animate-spin'/> Solicitando permiso de la cámara...</div>;
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
                            <Button onClick={handleToggleAttendance} size="lg" disabled={!allStudents || allStudents.length === 0}>
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
