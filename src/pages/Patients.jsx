import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import PatientFormDialog from '@/components/patients/PatientFormDialog';
import { formatCurrency } from '@/lib/utils/time';
import { toast } from '@/components/ui/use-toast';

export default function Patients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', user?.uid],
    queryFn: () => base44.entities.Patient.list(),
    enabled: !!user?.uid,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.create(data),
    onSuccess: (savedPatient) => {
      queryClient.setQueryData(['patients', user?.uid], (current = []) => {
        const safeCurrent = Array.isArray(current) ? current : [];
        return [savedPatient, ...safeCurrent.filter((p) => p.id !== savedPatient?.id)];
      });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDialogOpen(false);
      toast({
        title: 'Paciente cadastrado',
        description: 'O paciente foi salvo com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao cadastrar paciente',
        description: error?.message || 'Nao foi possivel salvar. Verifique sua conexao e permissoes.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Patient.update(id, data),
    onSuccess: (updatedPatient) => {
      queryClient.setQueryData(['patients', user?.uid], (current = []) => {
        const safeCurrent = Array.isArray(current) ? current : [];
        return safeCurrent.map((p) => (p.id === updatedPatient?.id ? { ...p, ...updatedPatient } : p));
      });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDialogOpen(false);
      setEditingPatient(null);
      toast({
        title: 'Paciente atualizado',
        description: 'As alteracoes foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar paciente',
        description: error?.message || 'Nao foi possivel atualizar este paciente.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Patient.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(['patients', user?.uid], (current = []) => {
        const safeCurrent = Array.isArray(current) ? current : [];
        return safeCurrent.filter((p) => p.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDeleteTarget(null);
      toast({
        title: 'Paciente excluido',
        description: 'Cadastro removido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir paciente',
        description: error?.message || 'Nao foi possivel excluir este paciente.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = (data) => {
    if (editingPatient) {
      updateMutation.mutate({ id: editingPatient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle={`${patients.length} paciente${patients.length !== 1 ? 's' : ''} cadastrado${patients.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => { setEditingPatient(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Paciente
          </Button>
        }
      />

      {patients.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Nenhum resultado' : 'Nenhum paciente'}
          description={search ? 'Tente outra busca' : 'Cadastre seu primeiro paciente para começar.'}
          action={!search && (
            <Button onClick={() => { setEditingPatient(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Paciente
            </Button>
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="p-5 border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">
                      {patient.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="text-sm text-accent font-medium">{formatCurrency(patient.hourly_rate)}/h</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setEditingPatient(patient); setDialogOpen(true); }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(patient)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {patient.notes && (
                <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{patient.notes}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}