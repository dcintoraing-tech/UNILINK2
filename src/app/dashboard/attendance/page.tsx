"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User as UserIcon, Camera, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


// --- DATA PERSISTENCE & TYPES (Copied for standalone functionality) ---

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.log(error);
        setStoredValue(initialValue);
      }
      setIsInitialized(true); 
    }
  }, [key, initialValue]);

  const setValue = (value: T | ((val: T) => T)) => {
    if (!isInitialized) return;
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
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

// --- UTILITY FUNCTIONS ---

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        return 0;
    }
    const dotProduct = vecA.map((val, i) => val * vecB[i]).reduce((acc, val) => acc + val, 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

// --- MAIN COMPONENT ---

export default function AttendancePage() {
    const { toast } = useToast();
    const [allStudents] = useLocalStorage<Student[]>('unilink-students', []);
    
    const [isTakingAttendance, setIsTakingAttendance] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [identifiedStudents, setIdentifiedStudents] = useState<Set<string>>(new Set());
    const [scanProgress, setScanProgress] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setHasCameraPermission(null);
    }, []);

    const handleRecognition = useCallback(() => {
        if (!videoRef.current || allStudents.length === 0) return;

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
            const studentId = bestMatch.student.id;
            
            setIdentifiedStudents(prev => {
                if (prev.has(studentId)) {
                    return prev;
                }
                const newSet = new Set(prev);
                newSet.add(studentId);
                
                toast({
                    title: "Estudiante Identificado",
                    description: `${bestMatch.student!.firstName} ${bestMatch.student!.lastName} ha sido marcado como presente.`,
                });

                return newSet;
            });
        }
    }, [allStudents, toast]);

    // Effect for managing camera lifecycle
    useEffect(() => {
        if (!isTakingAttendance) {
            stopCamera();
            return;
        }

        let isCancelled = false;

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

        return () => {
            isCancelled = true;
            stopCamera();
        };
    }, [isTakingAttendance, stopCamera, toast]);
    
    // Effect for managing recognition intervals
    useEffect(() => {
        if (!isTakingAttendance || hasCameraPermission !== true) {
            return;
        }

        const recognitionInterval = setInterval(handleRecognition, 2000);
        const progressInterval = setInterval(() => {
            setScanProgress(prev => (prev >= 100 ? 0 : prev + 5));
        }, 100);

        return () => {
            clearInterval(recognitionInterval);
            clearInterval(progressInterval);
            setScanProgress(0);
        };
    }, [isTakingAttendance, hasCameraPermission, handleRecognition]);

    const handleToggleAttendance = () => {
        if (!isTakingAttendance) {
            setIdentifiedStudents(new Set());
        }
        setIsTakingAttendance(prev => !prev);
    };

    const presentStudentsList = allStudents.filter(s => identifiedStudents.has(s.id));

    const renderCameraState = () => {
        if (!isTakingAttendance) {
            return (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Camera className="w-16 h-16" />
                    <p>La cámara está desactivada. Haz clic en "Iniciar" para comenzar.</p>
                </div>
            );
        }
        if (hasCameraPermission === null) {
            return <p>Solicitando permiso de la cámara...</p>;
        }
        if (hasCameraPermission === false) {
             return (
                <Alert variant="destructive" className="max-w-md">
                    <AlertTitle>Acceso a Cámara Requerido</AlertTitle>
                    <AlertDescription>
                        No se puede pasar lista sin acceso a la cámara. Por favor, actualiza los permisos en tu navegador.
                    </AlertDescription>
                </Alert>
            );
        }
        // If we are here, camera is active, but we show nothing, the video stream should be visible
        return null;
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <CardTitle>Pase de Lista por Reconocimiento Facial</CardTitle>
                            <CardDescription>Inicia el proceso para marcar la asistencia de los estudiantes automáticamente.</CardDescription>
                        </div>
                        <Button 
                            onClick={handleToggleAttendance}
                            size="lg"
                        >
                            {isTakingAttendance ? 'Detener Pase de Lista' : 'Iniciar Pase de Lista'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                        <video 
                            ref={videoRef}
                            className={cn("w-full h-full object-cover", !isTakingAttendance && "hidden")}
                            autoPlay
                            muted
                            playsInline
                        />
                        <div className={cn("absolute inset-0 flex items-center justify-center", isTakingAttendance && hasCameraPermission ? 'hidden' : 'flex')}>
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
                    <CardTitle>Estudiantes Presentes ({presentStudentsList.length})</CardTitle>
                    <CardDescription>Estudiantes identificados durante esta sesión.</CardDescription>
                </CardHeader>
                <CardContent>
                    {presentStudentsList.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {presentStudentsList.map(student => (
                                <div key={student.id} className="flex flex-col items-center text-center gap-2">
                                     <Avatar className="w-20 h-20 border-2 border-green-500">
                                        <AvatarImage src={student.facialImage || undefined} alt={student.firstName} />
                                        <AvatarFallback><UserIcon /></AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-40">
                            <Users className="w-12 h-12 mb-4"/>
                            <p>Aún no se ha identificado a ningún estudiante.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
