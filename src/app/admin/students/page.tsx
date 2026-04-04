"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User as UserIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlaceHolderImages } from '@/lib/placeholder-images';

// --- DATA PERSISTENCE HOOK ---
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

interface CatalogItem {
    id: string;
    name: string;
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    controlNumber: string;
    academicProgramId: string;
    assignedGroupId: string;
    facialImage: string | null;
}

export default function StudentRegistrationPage() {
    const { toast } = useToast();
    const [carreras] = useLocalStorage<CatalogItem[]>('unilink-carreras', []);
    const [grupos] = useLocalStorage<CatalogItem[]>('unilink-grupos', []);
    const [students, setStudents] = useLocalStorage<Student[]>('unilink-students', []);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [controlNumber, setControlNumber] = useState('');
    const [academicProgram, setAcademicProgram] = useState('');
    const [assignedGroup, setAssignedGroup] = useState('');

    // Biometrics state
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const studentPlaceholder = PlaceHolderImages.find(p => p.id === 'student-placeholder');

    const startCapture = async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            setHasCameraPermission(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCapturing(true);
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
                variant: 'destructive',
                title: 'Acceso a la cámara denegado',
                description: 'Por favor, habilita los permisos de la cámara en tu navegador.',
            });
        }
    };

    const takePicture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
            }
        }
        stopCapture();
    };

    const stopCapture = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
    };

    const handleRegisterStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !controlNumber || !academicProgram || !assignedGroup) {
            toast({
                variant: 'destructive',
                title: 'Campos requeridos',
                description: 'Por favor, completa toda la información del estudiante.',
            });
            return;
        }

        const newStudent: Student = {
            id: new Date().toISOString(),
            firstName,
            lastName,
            controlNumber,
            academicProgramId: academicProgram,
            assignedGroupId: assignedGroup,
            facialImage: capturedImage,
        };

        setStudents(prev => [...prev, newStudent]);

        toast({
            title: 'Estudiante Registrado',
            description: `El estudiante ${firstName} ${lastName} ha sido guardado.`,
        });

        // Reset form
        setFirstName('');
        setLastName('');
        setControlNumber('');
        setAcademicProgram('');
        setAssignedGroup('');
        setCapturedImage(null);
    };
    
    // Cleanup stream on component unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <form onSubmit={handleRegisterStudent} className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Registro de Estudiantes</CardTitle>
                    <CardDescription>Captura la información personal y académica del estudiante.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="firstName">Nombre(s)</Label>
                            <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lastName">Apellido(s)</Label>
                            <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="controlNumber">Número de Control</Label>
                        <Input id="controlNumber" value={controlNumber} onChange={e => setControlNumber(e.target.value)} required />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="academicProgram">Programa Académico</Label>
                            <Select value={academicProgram} onValueChange={setAcademicProgram} required>
                                <SelectTrigger id="academicProgram">
                                    <SelectValue placeholder="Selecciona un programa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {carreras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="assignedGroup">Grupo Asignado</Label>
                            <Select value={assignedGroup} onValueChange={setAssignedGroup} required>
                                <SelectTrigger id="assignedGroup">
                                    <SelectValue placeholder="Selecciona un grupo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Biometría Facial</CardTitle>
                    <CardDescription>Registra el rostro del estudiante.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center gap-4">
                    <Avatar className="w-40 h-40 border-2 border-dashed">
                        <AvatarImage src={capturedImage || studentPlaceholder?.imageUrl} alt="Rostro del estudiante" data-ai-hint={studentPlaceholder?.imageHint} />
                        <AvatarFallback className="text-6xl"><UserIcon /></AvatarFallback>
                    </Avatar>
                    
                    {isCapturing && (
                        <div className="w-full aspect-video rounded-md overflow-hidden bg-muted">
                           <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                        </div>
                    )}
                    
                    {hasCameraPermission === false && (
                         <Alert variant="destructive">
                            <AlertTitle>Acceso a Cámara Requerido</AlertTitle>
                            <AlertDescription>
                                Por favor, permite el acceso a la cámara para usar esta función.
                            </AlertDescription>
                        </Alert>
                    )}

                    {!isCapturing ? (
                        <Button type="button" onClick={startCapture} className="w-full">
                            <Camera className="mr-2 h-4 w-4" />
                            Iniciar Captura
                        </Button>
                    ) : (
                        <div className="w-full grid grid-cols-2 gap-2">
                             <Button type="button" variant="secondary" onClick={stopCapture}>Cancelar</Button>
                             <Button type="button" onClick={takePicture}>Capturar</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="md:col-span-3 text-right">
                <Button type="submit" size="lg">Registrar Estudiante</Button>
            </div>

            <canvas ref={canvasRef} className="hidden"></canvas>
        </form>
    );
}
