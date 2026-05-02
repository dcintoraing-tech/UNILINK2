
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Camera, Users, FilePlus, Group, Loader2, XCircle, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as faceapi from 'face-api.js';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, writeBatch, collection, addDoc } from 'firebase/firestore';

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
type DaySchedule = { [blockIndex: string]: HorarioBlock | null };
type ScheduleData = { [day: string]: DaySchedule };
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
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: horariosData } = useCollection<Horario>(useMemoFirebase(() => collection(firestore, 'horarios'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    const { data: materiasData } = useCollection<AsignacionMateria>(useMemoFirebase(() => collection(firestore, 'materiaAsignaciones'), [firestore]));
    const { data: attendanceData } = useCollection<AttendanceRecord>(useMemoFirebase(() => collection(firestore, 'attendance'), [firestore]));
    const { data: configData } = useDoc<AttendanceConfig>(useMemoFirebase(() => doc(firestore, 'config', 'attendance'), [firestore]));
    
    const allStudents = useMemo(() => studentsData || [], [studentsData]);
    const horarios = useMemo(() => horariosData || [], [horariosData]);
    const grupos = useMemo(() => gruposData || [], [gruposData]);
    const materias = useMemo(() => materiasData || [], [materiasData]);
    const attendance = useMemo(() => attendanceData || [], [attendanceData]);
    const config = useMemo(() => configData || { toleranceMinutes: 10, absenceLimitMinutes: 30 }, [configData]);

    // --- Component State ---
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupStudentList, setGroupStudentList] = useState<DisplayStudent[]>([]);

    const [isTakingAttendance, setIsTakingAttendance] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);

    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
    const [faceMatcherError, setFaceMatcherError] = useState<string | null>(null);

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

                const MODEL_URL = window.location.origin + '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                
                setModelsLoaded(true);
                setModelError(null);

            } catch (error) {
                console.error("ERROR CARGANDO MODELOS:", error);
                setModelError("Error al cargar modelos de IA.");
            }
        };
        loadModels();
    }, []);

    // Create FaceMatcher when group changes
    useEffect(() => {
        if (!selectedGroup || allStudents.length === 0 || !modelsLoaded) {
            setFaceMatcher(null);
            return;
        }

        let isMounted = true;
        const createMatcher = () => {
            try {
                const studentsInGroup = allStudents.filter(s => s.assignedGroupId === selectedGroup && s.embedding && s.embedding.length > 0);
                if (studentsInGroup.length === 0) {
                    if (isMounted) setFaceMatcher(null);
                    return;
                }
                const labeledFaceDescriptors = studentsInGroup.map(student =>
                    new faceapi.LabeledFaceDescriptors(student.id, [Float32Array.from(student.embedding!)])
                );
                const newFaceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
                if (isMounted) {
                    setFaceMatcher(newFaceMatcher);
                    setFaceMatcherError(null);
                }
            } catch (error) {
                if (isMounted) setFaceMatcher(null);
            }
        }
        createMatcher();
        return () => { isMounted = false; }
    }, [selectedGroup, allStudents, modelsLoaded]);

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
            if (context) context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, []);

    const markAttendance = useCallback((studentId: string) => {
        setGroupStudentList(currentList => {
            const studentToMark = currentList.find(s => s.id === studentId);
            if (!studentToMark || studentToMark.status !== 'Pendiente') return currentList;
    
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            const arrivalTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const jsDay = now.getDay();
            const scheduleDayIndex = jsDay - 1;
    
            if (scheduleDayIndex < 0 || scheduleDayIndex > 4) return currentList;
    
            const studentSchedule = horarios.find(h => h.grupoId === studentToMark.assignedGroupId);
            if (!studentSchedule || !studentSchedule.schedule) return currentList;
    
            const todaySchedule = studentSchedule.schedule[String(scheduleDayIndex)];
            if (!todaySchedule || Object.keys(todaySchedule).length === 0) return currentList;
    
            const currentHour = now.getHours();
            const currentBlockIndex = currentHour - 7;
            let activeBlock: HorarioBlock | null = null;
            let activeBlockKey: string | undefined;
    
            const sortedBlockKeys = Object.keys(todaySchedule).map(Number).sort((a, b) => a - b);
            for (const key of sortedBlockKeys) {
                const block = todaySchedule[String(key)];
                if (block && key <= currentBlockIndex && (key + (block.duracion || 1) > currentBlockIndex)) {
                    activeBlock = block;
                    activeBlockKey = String(key);
                    break;
                }
            }
    
            if (!activeBlock || !activeBlockKey) return currentList;
    
            const { materiaId, docenteId } = activeBlock;
            const subjectName = materias.find(m => m.id === materiaId)?.materia || 'Materia';
            const horaInicioStr = ["07:00", "08:00", "09:00", "10:00"][parseInt(activeBlockKey, 10)];
            const [hours, minutes] = horaInicioStr.split(':').map(Number);
            const startTime = new Date(now);
            startTime.setHours(hours, minutes, 0, 0);
            const toleranceTime = new Date(startTime);
            toleranceTime.setMinutes(startTime.getMinutes() + config.toleranceMinutes);
            const status: AttendanceStatus = now <= toleranceTime ? 'Presente' : 'Retardo';
            
            toast({
                title: isSimulating ? `SIMULACIÓN: Asistencia (${status})` : `Asistencia Registrada (${status})`,
                description: `${studentToMark.firstName} marcado para ${subjectName}.`,
            });
            
            if (!isSimulating) {
                const recordId = `att-${studentId}-${dateString}-${materiaId}`;
                const recordRef = doc(firestore, 'attendance', recordId);
                setDoc(recordRef, {
                    studentId: studentId,
                    date: dateString,
                    materiaAsignacionId: materiaId,
                    docenteId: docenteId,
                    status: status,
                    arrivalTime: arrivalTime
                }).catch(err => console.error("Error writing record:", err));
            }
    
            return currentList.map(s =>
                s.id === studentId ? { ...s, status, arrivalTime, subjectName } : s
            );
        });
    }, [horarios, materias, config, toast, firestore, isSimulating]);

    // Recognition loop
    useEffect(() => {
        if (isTakingAttendance && modelsLoaded && faceMatcher && videoRef.current) {
            recognitionIntervalRef.current = setInterval(async () => {
                if (videoRef.current && canvasRef.current && !videoRef.current.paused && videoRef.current.readyState >= 3) {
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    const displaySize = { width: video.clientWidth, height: video.clientHeight };
                    faceapi.matchDimensions(canvas, displaySize);

                    try {
                        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                        resizedDetections.forEach(detection => {
                            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                            const isMatch = bestMatch.label !== 'unknown';
                            
                            // Only draw a generic box without name to keep it light
                            const drawBox = new faceapi.draw.DrawBox(detection.detection.box, { 
                                label: '', // Don't show name label
                                boxColor: isMatch ? 'rgba(0, 255, 0, 1)' : 'rgba(255, 0, 0, 1)'
                            });
                            drawBox.draw(canvas);

                            if (isMatch) markAttendance(bestMatch.label);
                        });
                    } catch (err) {
                        console.error("Error en detección:", err);
                    }
                }
            }, 1000); 
        }

        return () => {
            if (recognitionIntervalRef.current) clearInterval(recognitionIntervalRef.current);
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
                if (!isCancelled) {
                    setHasCameraPermission(false);
                    setIsTakingAttendance(false);
                    toast({ variant: 'destructive', title: 'Acceso denegado', description: 'Habilita los permisos de la cámara.' });
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
        } else {
            setIsTakingAttendance(false);
            if (isSimulating) {
                toast({ title: "Simulación finalizada", description: "No se guardaron registros." });
                setIsSimulating(false);
                return;
            }

            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            const jsDay = now.getDay();
            if (jsDay < 1 || jsDay > 5) return;
            
            const scheduleDayIndex = jsDay - 1;
            const studentSchedule = horarios.find(h => h.grupoId === selectedGroup);
            const todaySchedule = studentSchedule?.schedule?.[String(scheduleDayIndex)];

            if (!todaySchedule || Object.keys(todaySchedule).length === 0) return;

            const updatedList = [...groupStudentList];
            let absencesCount = 0;
            const batch = writeBatch(firestore);

            groupStudentList.forEach(student => {
                if (student.status === 'Pendiente') {
                    absencesCount++;
                    const idx = updatedList.findIndex(s => s.id === student.id);
                    if (idx > -1) updatedList[idx].status = 'Falta';

                    for (const blockIndexStr in todaySchedule) {
                        const block = todaySchedule[blockIndexStr];
                        if (block) {
                            const recordId = `att-${student.id}-${dateString}-${block.materiaId}`;
                            if (!attendance.some(a => a.id === recordId)) {
                                batch.set(doc(firestore, 'attendance', recordId), {
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
            });

            setGroupStudentList(updatedList);
            if (absencesCount > 0) {
                batch.commit().then(() => {
                    toast({ title: "Asistencia Guardada", description: `${absencesCount} falta(s) registradas.` });
                });
            }
        }
    };

    const handleOpenJustifyDialog = (student: DisplayStudent) => {
        setJustifyingStudent(student);
        setIsJustifyOpen(true);
    };

    const handleJustifySubmit = async () => {
        if (!justifyingStudent || !justificationReason) return;
        const attToJustify = attendance.find(a => a.studentId === justifyingStudent?.id && a.status === 'Falta');
        if (!attToJustify) return;

        const newJustificacion: Omit<Justificacion, 'id'> = {
            studentId: justifyingStudent.id,
            date: new Date().toISOString().split('T')[0],
            reason: justificationReason,
            status: 'Pendiente',
            attendanceRecordId: attToJustify.id,
            docenteId: attToJustify.docenteId!,
            materiaId: attToJustify.materiaAsignacionId,
        };

        try {
            await addDoc(collection(firestore, 'justificaciones'), newJustificacion);
            toast({ title: "Justificación Enviada" });
            setIsJustifyOpen(false);
            setJustificationReason('');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error al enviar' });
        }
    };

    const getStatusVariant = (status: DisplayStatus): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Presente': return 'default';
            case 'Retardo': return 'secondary';
            case 'Falta': return 'destructive';
            case 'Pendiente': return 'outline';
            default: return 'outline';
        }
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Asistencia</CardTitle>
                    <CardDescription>Pasa lista de forma oficial o realiza una simulación.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="group-select">Selecciona un Grupo</Label>
                            <Select onValueChange={setSelectedGroup} value={selectedGroup || ''} disabled={isTakingAttendance}>
                                <SelectTrigger id="group-select"><SelectValue placeholder="Elegir grupo..." /></SelectTrigger>
                                <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => handleToggleAttendance(false)} size="lg" disabled={!faceMatcher || (isTakingAttendance && isSimulating)}>
                                {isTakingAttendance && !isSimulating ? 'Detener Pase Oficial' : 'Iniciar Pase Oficial'}
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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Cámara en Vivo {isSimulating && <Badge variant="outline" className="bg-yellow-100 text-yellow-800">MODO SIMULACIÓN</Badge>}
                                </CardTitle>
                                <CardDescription>Detección ligera habilitada.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                                {!isTakingAttendance && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white text-center">
                                        <Camera className="w-16 h-16 mb-4" />
                                        <p className="text-lg font-medium">Cámara desactivada</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Lista de Alumnos - {grupos.find(g => g.id === selectedGroup)?.name}</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Alumno</TableHead>
                                        <TableHead>Materia</TableHead>
                                        <TableHead>Hora</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupStudentList.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={student.facialImage || undefined} />
                                                        <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{student.firstName} {student.lastName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{student.subjectName || '-'}</TableCell>
                                            <TableCell>{student.arrivalTime || '-'}</TableCell>
                                            <TableCell><Badge variant={getStatusVariant(student.status)}>{student.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="secondary" size="sm" onClick={() => handleOpenJustifyDialog(student)} disabled={student.status !== 'Falta' || isSimulating}>
                                                    <FilePlus className="mr-2 h-3 w-3" /> Justificar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}

            <Dialog open={isJustifyOpen} onOpenChange={setIsJustifyOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Justificar Falta</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="reason">Motivo</Label>
                        <Textarea id="reason" value={justificationReason} onChange={(e) => setJustificationReason(e.target.value)} placeholder="Indica el motivo de la inasistencia..." />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsJustifyOpen(false)}>Cancelar</Button>
                        <Button onClick={handleJustifySubmit}>Enviar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
