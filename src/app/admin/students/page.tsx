"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User as UserIcon, PlusCircle, MoreHorizontal, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    embedding: number[] | null;
}

function StudentRegistrationForm({ onFinished, carreras, grupos }: { onFinished: () => void, carreras: CatalogItem[], grupos: CatalogItem[] }) {
    const { toast } = useToast();
    const [, setStudents] = useLocalStorage<Student[]>('unilink-students', []);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [controlNumber, setControlNumber] = useState('');
    const [academicProgram, setAcademicProgram] = useState('');
    const [assignedGroup, setAssignedGroup] = useState('');

    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const studentPlaceholder = PlaceHolderImages.find(p => p.id === 'student-placeholder');

    const stopCapture = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
    };
    
    const startCapture = async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setCapturedImage(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            setHasCameraPermission(true);
            setIsCapturing(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
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
            // Simulate embedding generation. In a real application, this would
            // be a call to an AI service to get a facial embedding vector.
            embedding: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
        };

        setStudents(prev => [...prev, newStudent]);

        toast({
            title: 'Estudiante Registrado',
            description: `El estudiante ${firstName} ${lastName} ha sido guardado.`,
        });

        onFinished();
    };
    
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <form onSubmit={handleRegisterStudent} className="space-y-6">
             <ScrollArea className="max-h-[65vh] pr-4">
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="md:col-span-2 border-0 shadow-none">
                        <CardContent className="grid gap-6 p-1">
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

                    <Card className="flex flex-col border-0 shadow-none">
                        <CardContent className="flex-1 flex flex-col items-center justify-center gap-4 p-1">
                            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                                <video 
                                    ref={videoRef}
                                    className={cn("w-full h-full object-cover", !isCapturing && "hidden")}
                                    autoPlay
                                    muted
                                    playsInline
                                />
                                {!isCapturing && (
                                    <Avatar className="w-40 h-40 border-2 border-dashed">
                                        <AvatarImage src={capturedImage || studentPlaceholder?.imageUrl} alt="Rostro del estudiante" data-ai-hint={studentPlaceholder?.imageHint} />
                                        <AvatarFallback className="text-6xl"><UserIcon /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                            
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
                </div>
            </ScrollArea>

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
                <Button type="submit">Registrar Estudiante</Button>
            </DialogFooter>

            <canvas ref={canvasRef} className="hidden"></canvas>
        </form>
    );
}

export default function StudentsPage() {
    const [students, setStudents] = useLocalStorage<Student[]>('unilink-students', []);
    const [carreras] = useLocalStorage<CatalogItem[]>('unilink-carreras', []);
    const [grupos] = useLocalStorage<CatalogItem[]>('unilink-grupos', []);
    const { toast } = useToast();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        const lowercasedQuery = searchQuery.toLowerCase();
        return students.filter(student => 
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(lowercasedQuery) ||
            student.controlNumber.toLowerCase().includes(lowercasedQuery)
        );
    }, [students, searchQuery]);

    const getProgramName = (id: string) => carreras.find(c => c.id === id)?.name || 'N/A';
    const getGroupName = (id: string) => grupos.find(g => g.id === id)?.name || 'N/A';
    
    const handleDeleteStudent = (studentId: string) => {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        toast({
            title: "Estudiante eliminado",
            description: "El estudiante ha sido eliminado del sistema."
        });
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <CardTitle>Gestión de Estudiantes</CardTitle>
                            <CardDescription>Consulta, busca y registra nuevos estudiantes.</CardDescription>
                        </div>
                         <div className="flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 md:grow-0">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Buscar por nombre o control..."
                                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Registrar Estudiante</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Programa Académico</TableHead>
                                <TableHead>Grupo</TableHead>
                                <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={student.facialImage || undefined} alt={`${student.firstName} ${student.lastName}`} />
                                                <AvatarFallback><UserIcon /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{student.firstName} {student.lastName}</div>
                                                <div className="text-sm text-muted-foreground">{student.controlNumber}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getProgramName(student.academicProgramId)}</TableCell>
                                    <TableCell>{getGroupName(student.assignedGroupId)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Menú</span></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem disabled>Editar</DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>Esta acción no se puede deshacer y eliminará permanentemente al estudiante.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteStudent(student.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No se encontraron estudiantes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{filteredStudents.length}</strong> de <strong>{students.length}</strong> estudiantes
                    </div>
                </CardFooter>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Registro de Estudiantes</DialogTitle>
                        <DialogDescription>Captura la información personal, académica y biométrica del estudiante.</DialogDescription>
                    </DialogHeader>
                    <StudentRegistrationForm 
                        onFinished={() => setIsDialogOpen(false)}
                        carreras={carreras}
                        grupos={grupos}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
