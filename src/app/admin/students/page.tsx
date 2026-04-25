
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User as UserIcon, PlusCircle, MoreHorizontal, Search, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as faceapi from 'face-api.js';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- INTERFACES ---
interface CatalogItem {
    id: string;
    name: string;
}

interface Grupo extends CatalogItem {
    carreraId: string;
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

type NewStudentData = Omit<Student, 'id'>;

function StudentRegistrationForm({ 
    onFinished, 
    carreras, 
    grupos, 
    initialData,
    onSave
}: { 
    onFinished: () => void, 
    carreras: CatalogItem[], 
    grupos: Grupo[], 
    initialData: Student | null,
    onSave: (studentData: NewStudentData | Student) => Promise<void> 
}) {
    const { toast } = useToast();

    const [firstName, setFirstName] = useState(initialData?.firstName || '');
    const [lastName, setLastName] = useState(initialData?.lastName || '');
    const [controlNumber, setControlNumber] = useState(initialData?.controlNumber || '');
    const [academicProgram, setAcademicProgram] = useState(initialData?.academicProgramId || '');
    const [assignedGroup, setAssignedGroup] = useState(initialData?.assignedGroupId || '');

    const [capturedImage, setCapturedImage] = useState<string | null>(initialData?.facialImage || null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);

    const studentPlaceholder = PlaceHolderImages.find(p => p.id === 'student-placeholder');

    useEffect(() => {
        const loadModels = async () => {
            if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                const errorMsg = 'El acceso a la cámara y los modelos de IA no están disponibles en un entorno no seguro. Por favor, usa una conexión HTTPS.';
                setModelError(errorMsg);
                return;
            }
            try {
                const MODEL_URL = window.location.origin + '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                setModelError(null);
            } catch (error) {
                console.error("ERROR REAL AL CARGAR MODELOS:", error);
                const userFriendlyMessage = "No se pudieron cargar los modelos de IA. Esto suele ocurrir si los archivos en la carpeta /public/models no son accesibles o están corruptos. Verifica la consola del navegador para ver el error específico.";
                setModelError(userFriendlyMessage);
            }
        };
        loadModels();
    }, []);

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

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !controlNumber || !academicProgram || !assignedGroup) {
            toast({
                variant: 'destructive',
                title: 'Campos requeridos',
                description: 'Por favor, completa toda la información del estudiante.',
            });
            return;
        }
        if (!capturedImage) {
            toast({
                variant: 'destructive',
                title: 'Imagen requerida',
                description: 'Por favor, captura una imagen del rostro del estudiante.',
            });
            return;
        }

        setIsProcessing(true);

        let embedding: number[] | null = initialData?.embedding || null;
        
        if (capturedImage && capturedImage !== initialData?.facialImage) {
            try {
                const img = document.createElement('img');
                img.src = capturedImage;
                await new Promise(resolve => { img.onload = resolve; });

                const detection = await faceapi
                    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                
                if (!detection) {
                    toast({
                        variant: 'destructive',
                        title: 'Rostro no detectado',
                        description: 'No se pudo encontrar un rostro en la imagen. Por favor, intenta de nuevo con buena iluminación y el rostro centrado.',
                    });
                    setIsProcessing(false);
                    return;
                }

                embedding = Array.from(detection.descriptor);

            } catch (error) {
                console.error("Error generating embedding:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error de Procesamiento',
                    description: 'No se pudo procesar la imagen facial.',
                });
                setIsProcessing(false);
                return;
            }
        }
        
        if (!embedding) {
            toast({
                variant: 'destructive',
                title: 'Huella Facial Requerida',
                description: 'No se pudo generar una huella facial. Asegúrate de capturar una nueva imagen si es un nuevo estudiante.',
            });
            setIsProcessing(false);
            return;
        }
        
        try {
            if (initialData) {
                const updatedStudent: Student = {
                    ...initialData,
                    firstName,
                    lastName,
                    controlNumber,
                    academicProgramId: academicProgram,
                    assignedGroupId: assignedGroup,
                    facialImage: capturedImage,
                    embedding: embedding,
                };
                await onSave(updatedStudent);
            } else {
                 const newStudent: NewStudentData = {
                    firstName,
                    lastName,
                    controlNumber,
                    academicProgramId: academicProgram,
                    assignedGroupId: assignedGroup,
                    facialImage: capturedImage,
                    embedding: embedding,
                };
                await onSave(newStudent);
            }
            onFinished();
        } catch (error) {
            console.error("Error saving student to Firestore:", error);
            toast({ variant: 'destructive', title: 'Error al Guardar', description: 'No se pudo guardar la información en la base de datos.'});
        } finally {
            setIsProcessing(false);
        }
    };
    
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <form onSubmit={handleSaveStudent} className="space-y-6">
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
                                    className={cn("w-full h-full", !isCapturing && "hidden")}
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
                                    {capturedImage ? 'Capturar de Nuevo' : 'Iniciar Captura'}
                                </Button>
                            ) : (
                                <div className="w-full grid grid-cols-2 gap-2">
                                    <Button type="button" variant="secondary" onClick={stopCapture}>Cancelar</Button>
                                    <Button type="button" onClick={takePicture}>Capturar</Button>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex-col gap-2 pt-4">
                            {modelError && (
                                <Alert variant="destructive" className="text-xs">
                                    <AlertTitle>Error de Modelos</AlertTitle>
                                    <AlertDescription>{modelError}</AlertDescription>
                                </Alert>
                            )}
                            {!modelsLoaded && !modelError && (
                                <Alert className="text-xs">
                                    <AlertDescription>Cargando modelos de IA...</AlertDescription>
                                </Alert>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </ScrollArea>

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
                <Button type="submit" disabled={!modelsLoaded || isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isProcessing ? 'Procesando...' : (initialData ? 'Guardar Cambios' : 'Registrar Estudiante')}
                </Button>
            </DialogFooter>

            <canvas ref={canvasRef} className="hidden"></canvas>
        </form>
    );
}

export default function StudentsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const { data: studentsData } = useCollection<Student>(useMemoFirebase(() => collection(firestore, 'students'), [firestore]));
    const { data: carrerasData } = useCollection<CatalogItem>(useMemoFirebase(() => collection(firestore, 'carreras'), [firestore]));
    const { data: gruposData } = useCollection<Grupo>(useMemoFirebase(() => collection(firestore, 'grupos'), [firestore]));
    
    const students = studentsData || [];
    const carreras = carrerasData || [];
    const grupos = gruposData || [];
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
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
    
    const handleSaveStudent = async (studentData: NewStudentData | Student) => {
        try {
            if ('id' in studentData) { // Editing
                const studentDocRef = doc(firestore, 'students', studentData.id);
                await updateDoc(studentDocRef, studentData);
                toast({ title: 'Estudiante Actualizado', description: `Los datos de ${studentData.firstName} han sido actualizados.` });
            } else { // Creating
                await addDoc(collection(firestore, 'students'), studentData);
                toast({ title: 'Estudiante Registrado', description: `El estudiante ${studentData.firstName} ha sido guardado.` });
            }
            window.location.reload();
        } catch (error) {
            console.error("Error saving student:", error);
            toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo guardar el estudiante.' });
            throw error; // Re-throw to be caught in the form
        }
    };
    
    const handleDeleteStudent = async (studentId: string) => {
        try {
            await deleteDoc(doc(firestore, 'students', studentId));
            toast({
                title: "Estudiante eliminado",
                description: "El estudiante ha sido eliminado del sistema."
            });
            window.location.reload();
        } catch (error) {
            console.error("Error deleting student:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar al estudiante.' });
        }
    };
    
    const handleOpenDialog = (student: Student | null) => {
        setEditingStudent(student);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setEditingStudent(null);
        setIsDialogOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Gestión de Estudiantes</CardTitle>
                            <CardDescription>Consulta, busca y registra nuevos estudiantes.</CardDescription>
                        </div>
                         <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-auto flex-1 md:grow-0">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Buscar por nombre o control..."
                                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button size="sm" onClick={() => handleOpenDialog(null)} className="w-full sm:w-auto">
                                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Registrar Estudiante</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Mobile View */}
                    <div className="grid gap-4 md:hidden">
                        {filteredStudents.map((student) => (
                            <Card key={student.id}>
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                     <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={student.facialImage || undefined} alt={`${student.firstName} ${student.lastName}`} />
                                            <AvatarFallback><UserIcon /></AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base font-semibold">{student.firstName} {student.lastName}</CardTitle>
                                            <CardDescription>{student.controlNumber}</CardDescription>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 -mt-2 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleOpenDialog(student)}>Editar</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">Eliminar</DropdownMenuItem></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer y eliminará permanentemente al estudiante.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => await handleDeleteStudent(student.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Programa</span>
                                        <span className="text-right">{getProgramName(student.academicProgramId)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Grupo</span>
                                        <span>{getGroupName(student.assignedGroupId)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Desktop View */}
                    <Table className="hidden md:table">
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
                                                <DropdownMenuItem onSelect={() => handleOpenDialog(student)}>Editar</DropdownMenuItem>
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
                                                        <AlertDialogAction onClick={async () => await handleDeleteStudent(student.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
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

            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    handleCloseDialog();
                } else {
                    setIsDialogOpen(true);
                }
            }}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{editingStudent ? 'Editar Estudiante' : 'Registro de Estudiantes'}</DialogTitle>
                        <DialogDescription>
                            {editingStudent ? 'Actualiza la información del estudiante.' : 'Captura la información personal, académica y biométrica del estudiante.'}
                        </DialogDescription>
                    </DialogHeader>
                    <StudentRegistrationForm 
                        onFinished={handleCloseDialog}
                        carreras={carreras}
                        grupos={grupos}
                        initialData={editingStudent}
                        onSave={handleSaveStudent}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
