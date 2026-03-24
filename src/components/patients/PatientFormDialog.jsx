import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function PatientFormDialog({ open, onOpenChange, patient, onSave, isSaving }) {
  const [form, setForm] = useState({ name: '', hourly_rate: '', notes: '' });

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name || '',
        hourly_rate: patient.hourly_rate || '',
        notes: patient.notes || '',
      });
    } else {
      setForm({ name: '', hourly_rate: '', notes: '' });
    }
  }, [patient, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedRate = String(form.hourly_rate).replace(',', '.');
    const hourlyRate = Number.parseFloat(normalizedRate);
    if (!form.name.trim() || Number.isNaN(hourlyRate)) return;

    onSave({
      name: form.name.trim(),
      hourly_rate: hourlyRate,
      notes: form.notes?.trim() || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          <DialogDescription>
            {patient
              ? 'Atualize os dados do paciente e salve as alteracoes.'
              : 'Preencha os dados para cadastrar um novo paciente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do paciente"
              required
            />
          </div>
          <div>
            <Label htmlFor="rate">Valor por hora (R$)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              value={form.hourly_rate}
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
              placeholder="150.00"
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Observações sobre o paciente..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}