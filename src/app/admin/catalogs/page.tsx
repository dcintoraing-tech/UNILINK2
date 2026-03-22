"use client";

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CatalogItem {
    id: string;
    name: string;
}

const STORAGE_KEYS = {
    carreras: 'unilink-carreras',
    grupos: 'unilink-grupos-catalogo',
    cuatrimestres: 'unilink-cuatrimestres',
    turnos: 'unilink-turnos',
};

const initialData = {
    carreras: [{ id: '1', name: 'Ingeniería de Software' }, { id: '2', name: 'Licenciatura en Diseño Gráfico' }],
    grupos: [{ id: '1', name: 'A-101' }, { id: '2', name: 'B-202' }],
    cuatrimestres: [{ id: '1', name: '2024-1' }, { id: '2', name: '2024-2' }],
    turnos: [{ id: '1', name: 'Matutino' }, { id: '2', name: 'Vespertino' }],
};


function CatalogTable({ title, data, setData }: { title: string, data: CatalogItem[], setData: React.Dispatch<React.SetStateAction<CatalogItem[]>> }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const { toast } = useToast();

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (!name) return;

        if (editingItem) {
            const updatedItems = data.map(item => item.id === editingItem.id ? { ...item, name } : item);
            setData(updatedItems);
            toast({ title: "Elemento actualizado", description: `El elemento ha sido actualizado.` });
        } else {
            const newItem: CatalogItem = {
                id: Date.now().toString(),
                name,
            };
            setData([...data, newItem]);
            toast({ title: "Elemento agregado", description: `El nuevo elemento ha sido agregado.` });
        }

        setIsDialogOpen(false);
        setEditingItem(null);
    };

    const openEditDialog = (item: CatalogItem) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const handleDeleteItem = (itemId: string) => {
        setData(data.filter(item => item.id !== itemId));
        toast({ title: "Elemento eliminado", description: "El elemento ha sido eliminado correctamente." });
    };


    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <Button size="sm" onClick={openCreateDialog}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Agregar
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => openEditDialog(item)}>Editar</DropdownMenuItem>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                                    Eliminar
                                                  </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Esta acción no se puede deshacer.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                      Eliminar
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Editar' : 'Agregar'} {title.slice(0, -1)}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input id="name" name="name" defaultValue={editingItem?.name} required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit">{editingItem ? 'Guardar Cambios' : 'Agregar'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

export default function CatalogsPage() {
    const [carreras, setCarreras] = useState<CatalogItem[]>([]);
    const [grupos, setGrupos] = useState<CatalogItem[]>([]);
    const [cuatrimestres, setCuatrimestres] = useState<CatalogItem[]>([]);
    const [turnos, setTurnos] = useState<CatalogItem[]>([]);

    const catalogStates = {
        carreras: { state: carreras, setState: setCarreras, key: STORAGE_KEYS.carreras, initial: initialData.carreras },
        grupos: { state: grupos, setState: setGrupos, key: STORAGE_KEYS.grupos, initial: initialData.grupos },
        cuatrimestres: { state: cuatrimestres, setState: setCuatrimestres, key: STORAGE_KEYS.cuatrimestres, initial: initialData.cuatrimestres },
        turnos: { state: turnos, setState: setTurnos, key: STORAGE_KEYS.turnos, initial: initialData.turnos },
    };

    useEffect(() => {
        Object.values(catalogStates).forEach(({ setState, key, initial }) => {
            try {
                const storedData = localStorage.getItem(key);
                if (storedData) {
                    setState(JSON.parse(storedData));
                } else {
                    localStorage.setItem(key, JSON.stringify(initial));
                    setState(initial);
                }
            } catch (error) {
                console.error("Failed to access localStorage:", error);
                setState(initial);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        Object.values(catalogStates).forEach(({ state, key }) => {
             try {
                localStorage.setItem(key, JSON.stringify(state));
            } catch (error) {
                console.error(`Failed to save to localStorage (${key}):`, error);
            }
        });
    }, [carreras, grupos, cuatrimestres, turnos]);


    return (
      <div>
        <CardTitle className="mb-4">Catálogos Institucionales</CardTitle>
        <Tabs defaultValue="carreras">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="carreras">Carreras</TabsTrigger>
                <TabsTrigger value="grupos">Grupos</TabsTrigger>
                <TabsTrigger value="cuatrimestres">Cuatrimestres</TabsTrigger>
                <TabsTrigger value="turnos">Turnos</TabsTrigger>
            </TabsList>
            <TabsContent value="carreras">
                <CatalogTable title="Carreras" data={carreras} setData={setCarreras} />
            </TabsContent>
            <TabsContent value="grupos">
                <CatalogTable title="Grupos" data={grupos} setData={setGrupos} />
            </TabsContent>
            <TabsContent value="cuatrimestres">
                <CatalogTable title="Cuatrimestres" data={cuatrimestres} setData={setCuatrimestres} />
            </TabsContent>
            <TabsContent value="turnos">
                <CatalogTable title="Turnos" data={turnos} setData={setTurnos} />
            </TabsContent>
        </Tabs>
      </div>
    );
}
