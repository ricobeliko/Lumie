import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { calculateDurationMinutes, calculateValue, hasTimeConflict, formatDuration, formatCurrency, ROOM_LABELS } from '@/lib/utils/time';

export default function AppointmentFormDialog({
  open, onOpenChange, appointment, patients, allAppointments, user, onSave, isSaving,
}) {
  const [form, setForm] = useState({
    patient_id: '', room: '', date: '', start_time: '', end_time: '',
  });
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    if (appointment) {
      setForm({
        patient_id: appointment.patient_id || '',
        room: appointment.room || '',
        date: appointment.date || '',
        start_time: appointment.start_time || '',
        end_time: appointment.end_time || '',
      });
    } else {
      setForm({ patient_id: '', room: '', date: '', start_time: '', end_time: '' });
    }
    setConflict(null);
  }, [appointment, open]);

  // Check for conflicts
  useEffect(() => {
    if (!form.room || !form.date || !form.start_time || !form.end_time) {
      setConflict(null);
      return;
    }
    const conflicting = allAppointments.find((a) => {
      if (appointment && a.id === appointment.id) return false;
      if (a.status === 'cancelado') return false;
      return a.room === form.room && a.date === form.date &&
        hasTimeConflict(form.start_time, form.end_time, a.start_time, a.end_time);
    });
    setConflict(conflicting || null);
  }, [form.room, form.date, form.start_time, form.end_time, allAppointments, appointment]);

  const preview = useMemo(() => {
    if (!form.start_time || !form.end_time || !form.patient_id) return null;
    const dur = calculateDurationMinutes(form.start_time, form.end_time);
    if (dur <= 0) return null;
    const patient = patients.find((p) => p.id === form.patient_id);
    if (!patient) return null;
    const val = calculateValue(dur, patient.hourly_rate);
    return { duration: dur, value: val };
  }, [form, patients]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (conflict) return;
    const patient = patients.find((p) => p.id === form.patient_id);
    const dur = calculateDurationMinutes(form.start_time, form.end_time);
    const val = calculateValue(dur, patient.hourly_rate);

    onSave({
      ...form,
      patient_name: patient.name,
      duration_minutes: dur,
      total_value: val,
      professional_email: user.email,
      professional_name: user.full_name,
      status: appointment?.status || 'agendado',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Paciente</Label>
            <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sala</Label>
            <Select value={form.room} onValueChange={(v) => setForm({ ...form, room: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sala_pequena">Sala Pequena</SelectItem>
                <SelectItem value="sala_grande">Sala Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div>
              <Label>Término</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </div>
          </div>

          {conflict && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Conflito: <strong>{conflict.professional_name}</strong> já agendou{' '}
                {ROOM_LABELS[conflict.room]} das {conflict.start_time} às {conflict.end_time}.
              </span>
            </div>
          )}

          {preview && !conflict && (
            <div className="p-3 rounded-lg bg-primary/5 text-sm space-y-1">
              <p className="text-muted-foreground">Duração: <strong className="text-foreground">{formatDuration(preview.duration)}</strong></p>
              <p className="text-muted-foreground">Valor: <strong className="text-foreground">{formatCurrency(preview.value)}</strong></p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || !!conflict}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}