"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Camera, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as faceapi from 'face-api.js';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';

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
    duracion: number;
}
type DaySchedule = { [blockIndex: string]: HorarioBlock | null };
type ScheduleData = { [dayIndex: string]: DaySchedule };
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

// --- CONSTANTS ---
const HORAS_BLOQUE_INICIO = ["07:00", "08:00", "09:00", "10:00"];

export default function TeacherAttendancePage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    
    // --- Data fetching ---
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: horariosData } = useCollection<Horario>(useMemoFirebase(() => collection(firestore, 'horarios'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    const { data: materiasData } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
    const { data: configData } = useDoc<AttendanceConfig>(useMemoFirebase(() => doc(firestore, 'config', 'attendance'), [firestore]));
    
    const allStudents = useMemo(() => studentsData || [], [studentsData]);
    const horarios = useMemo(() => horariosData || [], [horariosData]);
    const grupos = useMemo(() => gruposData || [], [gruposData]);
    const materias = useMemo(() => materiasData || [], [materiasData]);
    const config = useMemo(() => configData || { toleranceMinutes: 10, absenceLimitMinutes: 30 }, [configData]);

    // --- State ---
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupStudentList, setGroupStudentList] = useState<DisplayStudent[]>([]);
    const [isTakingAttendance, setIsTakingAttendance] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);

    // --- Refs for video and control ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const processedIdsRef = useRef<Set<string>>(new Set());

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error("Error loading face models:", error);
            }
        };
        loadModels();
    }, []);

    // Create FaceMatcher when group/students change
    useEffect(() => {
        if (!selectedGroup || allStudents.length === 0 || !modelsLoaded) {
            setFaceMatcher(null);
            return;
        }

        const studentsInGroup = allStudents.filter(s => s.assignedGroupId === selectedGroup && s.embedding && s.embedding.length > 0);
        if (studentsInGroup.length === 0) {
            setFaceMatcher(null);
            return;
        }

        const labeledDescriptors = studentsInGroup.map(student => 
            new faceapi.LabeledFaceDescriptors(student.id, [new Float32Array(student.embedding!)])
        );
        setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.55));
    }, [selectedGroup, allStudents, modelsLoaded]);

    // Initialize list when group is selected
    useEffect(() => {
        if (selectedGroup) {
            const list = allStudents
                .filter(s => s.assignedGroupId === selectedGroup)
                .map(s => ({ ...s, status: 'Pendiente' as DisplayStatus }));
            setGroupStudentList(list);
            processedIdsRef.current = new Set();
        } else {
            setGroupStudentList([]);
        }
    }, [selectedGroup, allStudents]);

    const stopCamera = useCallback(() => {
        if (recognitionIntervalRef.current) clearInterval(recognitionIntervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    const markAttendance = useCallback((studentId: string) => {
        const student = allStudents.find(s => s.id === studentId);
        if (!student || processedIdsRef.current.has(studentId)) return;

        const now = new Date();
        const studentFullName = `${student.firstName} ${student.lastName}`;
        const arrivalTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Encontrar horario
        const jsDay = now.getDay();
        const scheduleDayIndex = jsDay - 1; 
        const groupSchedule = horarios.find(h => h.grupoId === student.assignedGroupId);
        const todaySchedule = groupSchedule?.schedule?.[String(scheduleDayIndex)];

        // Encontrar bloque activo
        const currentHour = now.getHours();
        const currentBlockIndex = currentHour - 7;
        let activeBlock: HorarioBlock | null = null;
        let activeBlockKey: string | null = null;

        if (todaySchedule) {
            Object.entries(todaySchedule).forEach(([key, block]) => {
                if (block) {
                    const startIdx = parseInt(key);
                    if (currentBlockIndex >= startIdx && currentBlockIndex < (startIdx + (block.duracion || 1))) {
                        activeBlock = block;
                        activeBlockKey = key;
                    }
                }
            });
        }

        if (isSimulating) {
            processedIdsRef.current.add(studentId);
            setGroupStudentList(prev => prev.map(s => 
                s.id === studentId ? { ...s, status: 'Presente', arrivalTime, subjectName: "Simulación" } : s
            ));
            toast({ title: "SIMULACIÓN: Identificado", description: `${studentFullName} está Presente (Prueba).` });
            return;
        }

        // MODO OFICIAL
        processedIdsRef.current.add(studentId);

        if (activeBlock && activeBlockKey) {
            const horaInicioStr = HORAS_BLOQUE_INICIO[parseInt(activeBlockKey)];
            const [hours, minutes] = horaInicioStr.split(':').map(Number);
            const startTime = new Date(now);
            startTime.setHours(hours, minutes, 0, 0);
            
            const toleranceTime = new Date(startTime);
            toleranceTime.setMinutes(startTime.getMinutes() + config.toleranceMinutes);
            
            const status: AttendanceStatus = now <= toleranceTime ? 'Presente' : 'Retardo';
            const subject = materias.find(m => m.id === activeBlock!.materiaId)?.materia || 'Clase';

            // ACTUALIZAR TABLA
            setGroupStudentList(prev => prev.map(s => 
                s.id === studentId ? { ...s, status, arrivalTime, subjectName: subject } : s
            ));

            toast({ title: "¡Asistencia Registrada!", description: `${studentFullName} está ${status} para ${subject}.` });

            // Guardar en DB
            const dateString = now.toISOString().split('T')[0];
            const recordId = `att-${studentId}-${dateString}-${activeBlock!.materiaId}`;
            setDoc(doc(firestore, 'attendance', recordId), {
                studentId,
                date: dateString,
                materiaAsignacionId: activeBlock!.materiaId,
                docenteId: activeBlock!.docenteId,
                status,
                arrivalTime
            }).catch(e => console.error("Error saving attendance:", e));
        } else {
            // No hay clase activa, pero igual cambiamos el estado en la TABLA para feedback visual
            setGroupStudentList(prev => prev.map(s => 
                s.id === studentId ? { ...s, status: 'Presente', arrivalTime, subjectName: "Fuera de Horario" } : s
            ));
            toast({ title: "Estudiante Identificado", description: `${studentFullName} reconocido. No hay clases activas ahora.` });
        }

    }, [allStudents, horarios, materias, config, isSimulating, toast, firestore]);

    // Recognition loop
    useEffect(() => {
        if (isTakingAttendance && modelsLoaded && faceMatcher && videoRef.current) {
            recognitionIntervalRef.current = setInterval(async () => {
                if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 3) {
                    const video = videoRef.current;
                    const canvas = canvasRef.current!;
                    const displaySize = { width: video.clientWidth, height: video.clientHeight };
                    faceapi.matchDimensions(canvas, displaySize);

                    try {
                        const detections = await faceapi
                            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                            .withFaceLandmarks()
                            .withFaceDescriptors();

                        const resizedDetections = faceapi.resizeResults(detections, displaySize);
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                        resizedDetections.forEach(detection => {
                            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                            const isMatch = bestMatch.label !== 'unknown';
                            
                            const drawBox = new faceapi.draw.DrawBox(detection.detection.box, { 
                                label: isMatch ? 'Reconocido' : 'Desconocido',
                                boxColor: isMatch ? 'rgba(0, 255, 0, 1)' : 'rgba(255, 0, 0, 1)'
                            });
                            drawBox.draw(canvas);

                            if (isMatch) {
                                markAttendance(bestMatch.label);
                            }
                        });
                    } catch (err) {
                        console.error("Error in face recognition loop:", err);
                    }
                }
            }, 700);
        }

        return () => {
            if (recognitionIntervalRef.current) clearInterval(recognitionIntervalRef.current);
        };
    }, [isTakingAttendance, modelsLoaded, faceMatcher, markAttendance]);

    // Camera control
    useEffect(() => {
        let isCancelled = false;
        if (!isTakingAttendance) {
            stopCamera();
            return;
        }

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (isCancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setHasCameraPermission(true);
            } catch (error) {
                console.error("Camera access error:", error);
                if (!isCancelled) {
                    setHasCameraPermission(false);
                    setIsTakingAttendance(false);
                    toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'Por favor permite el acceso a la cámara.' });
                }
            }
        };

        startCamera();
        return () => { isCancelled = true; stopCamera(); };
    }, [isTakingAttendance, stopCamera, toast]);

    const handleToggleAttendance = (simulation: boolean = false) => {
        if (!isTakingAttendance) {
            setIsSimulating(simulation);
            setIsTakingAttendance(true);
            processedIdsRef.current = new Set();
        } else {
            setIsTakingAttendance(false);
            if (isSimulating) {
                toast({ title: "Prueba Finalizada", description: "Los datos de prueba no fueron guardados." });
                setIsSimulating(false);
                return;
            }

            // MODO OFICIAL: Al cerrar, marcar faltas
            const now = new Date();
            const jsDay = now.getDay();
            const scheduleDayIdx = jsDay - 1;
            const groupSchedule = horarios.find(h => h.grupoId === selectedGroup);
            const todaySchedule = groupSchedule?.schedule?.[String(scheduleDayIdx)];

            if (todaySchedule && Object.keys(todaySchedule).length > 0) {
                const dateString = now.toISOString().split('T')[0];
                const batch = writeBatch(firestore);
                let absences = 0;

                groupStudentList.forEach(student => {
                    if (student.status === 'Pendiente') {
                        Object.values(todaySchedule).forEach(block => {
                            if (block) {
                                const recordId = `att-${student.id}-${dateString}-${block.materiaId}`;
                                batch.set(doc(firestore, 'attendance', recordId), {
                                    studentId: student.id,
                                    date: dateString,
                                    materiaAsignacionId: block.materiaId,
                                    docenteId: block.docenteId,
                                    status: 'Falta',
                                });
                            }
                        });
                        absences++;
                    }
                });

                if (absences > 0) {
                    batch.commit().then(() => {
                        toast({ title: "Pase de Lista Cerrado", description: `Se registraron faltas para ${absences} alumnos.` });
                    });
                }
            }
        }
    };

    const getStatusVariant = (status: DisplayStatus): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Presente': return 'default';
            case 'Retardo': return 'secondary';
            case 'Falta': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Pase de Asistencia Facial</CardTitle>
                    <CardDescription>Selecciona un grupo para iniciar la detección automática.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="group-select">Grupo</Label>
                            <Select onValueChange={setSelectedGroup} value={selectedGroup || ''} disabled={isTakingAttendance}>
                                <SelectTrigger id="group-select"><SelectValue placeholder="Elegir grupo..." /></SelectTrigger>
                                <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => handleToggleAttendance(false)} size="lg" disabled={!faceMatcher || (isTakingAttendance && isSimulating)}>
                                {isTakingAttendance && !isSimulating ? 'Detener Pase' : 'Iniciar Pase'}
                            </Button>
                            <Button onClick={() => handleToggleAttendance(true)} variant="outline" size="lg" disabled={!faceMatcher || (isTakingAttendance && !isSimulating)}>
                                <PlayCircle className="mr-2 h-5 w-5" />
                                {isTakingAttendance && isSimulating ? 'Detener Prueba' : 'Prueba de Pase'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedGroup && (
                <>
                    <Card className={cn(isSimulating && "border-yellow-500 bg-yellow-50/10")}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    Cámara en Vivo {isSimulating && <Badge variant="outline" className="bg-yellow-100 text-yellow-800">MODO PRUEBA</Badge>}
                                </CardTitle>
                                {isTakingAttendance && <span className="flex items-center gap-2 text-xs text-red-500 animate-pulse"><div className="w-2 h-2 rounded-full bg-red-500" /> Escaneando...</span>}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black border flex items-center justify-center">
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                                {!isTakingAttendance && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                                        <Camera className="w-12 h-12 mb-2" />
                                        <p>Cámara inactiva</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-0">
                            <CardTitle className="text-xl">Estado de Alumnos - {grupos.find(g => g.id === selectedGroup)?.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Alumno</TableHead>
                                        <TableHead>Clase</TableHead>
                                        <TableHead>Llegada</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupStudentList.length > 0 ? groupStudentList.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={student.facialImage || undefined} />
                                                        <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-sm">{student.firstName} {student.lastName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{student.subjectName || '-'}</TableCell>
                                            <TableCell className="text-sm">{student.arrivalTime || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(student.status)} className="gap-1">
                                                    {(student.status === 'Presente' || student.status === 'Retardo') && <CheckCircle2 className="h-3 w-3" />}
                                                    {student.status === 'Falta' && <AlertCircle className="h-3 w-3" />}
                                                    {student.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No hay alumnos registrados en este grupo.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
