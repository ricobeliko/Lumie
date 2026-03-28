import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { timeToMinutes, minutesToTime } from '@/lib/utils/time';

const DAYS_OF_WEEK = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
];

export default function PatientFormDialog({ open, onOpenChange, patient, onSave, isSaving }) {
  const [form, setForm] = useState({ name: '', hourly_rate: '', notes: '', schedules: [] });

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name || '',
        hourly_rate: patient.hourly_rate || '',
        notes: patient.notes || '',
        schedules: patient.schedules || [],
      });
    } else {
      setForm({ name: '', hourly_rate: '', notes: '', schedules: [] });
    }
  }, [patient, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedRate = String(form.hourly_rate).replace(',', '.');
    const hourlyRate = Number.parseFloat(normalizedRate);
    if (!form.name.trim() || Number.isNaN(hourlyRate)) return;

    // Filtra horários incompletos para evitar salvar erros no banco
    const validSchedules = form.schedules.filter(s => s.dayOfWeek && s.start_time && s.end_time && s.room);

    onSave({
      name: form.name.trim(),
      hourly_rate: hourlyRate,
      notes: form.notes?.trim() || '',
      schedules: validSchedules,
    });
  };

  const addSchedule = () => {
    setForm({
      ...form,
      // Já adiciona o novo horário com duração de 50 minutos como sugestão
      schedules: [...form.schedules, { dayOfWeek: '1', start_time: '10:00', end_time: '10:50', room: 'sala_pequena' }]
    });
  };

  const removeSchedule = (index) => {
    const newSchedules = [...form.schedules];
    newSchedules.splice(index, 1);
    setForm({ ...form, schedules: newSchedules });
  };

  const updateSchedule = (index, field, value) => {
    const newSchedules = [...form.schedules];
    newSchedules[index][field] = value;
    
    // Autocompleta o horário de término (+50 min) quando o horário de início for alterado
    if (field === 'start_time' && value) {
      try {
        const startMins = timeToMinutes(value);
        newSchedules[index].end_time = minutesToTime(startMins + 50);
      } catch (e) {
        // Ignora caso o horário digitado seja inválido durante a digitação
      }
    }

    setForm({ ...form, schedules: newSchedules });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{patient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          <DialogDescription>
            {patient
              ? 'Atualize os dados e os horários fixos do paciente.'
              : 'Preencha os dados para cadastrar um novo paciente e seus horários recorrentes.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
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
              <Label htmlFor="rate">Valor da sessão de 50 min (R$)</Label>
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
                rows={2}
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Sessão de Horários Fixos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-base">Horários Fixos Recorrentes</Label>
                <p className="text-xs text-muted-foreground">Estes horários se repetem toda semana.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSchedule}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Horário
              </Button>
            </div>

            {form.schedules.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-md text-center border border-dashed border-border">
                Nenhum horário fixo cadastrado.
              </p>
            )}

            <div className="space-y-3">
              {form.schedules.map((schedule, index) => (
                <div key={index} className="flex flex-wrap sm:flex-nowrap gap-3 items-end border border-border p-3 rounded-md bg-secondary/10 relative group">
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs mb-1 block">Dia da Semana</Label>
                    <Select value={schedule.dayOfWeek} onValueChange={(v) => updateSchedule(index, 'dayOfWeek', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-[100px]">
                    <Label className="text-xs mb-1 block">Início</Label>
                    <Input 
                      type="time" 
                      value={schedule.start_time} 
                      onChange={(e) => updateSchedule(index, 'start_time', e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="w-[100px]">
                    <Label className="text-xs mb-1 block">Término</Label>
                    <Input 
                      type="time" 
                      value={schedule.end_time} 
                      onChange={(e) => updateSchedule(index, 'end_time', e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-xs mb-1 block">Sala</Label>
                    <Select value={schedule.room} onValueChange={(v) => updateSchedule(index, 'room', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sala_pequena">Sala Pequena</SelectItem>
                        <SelectItem value="sala_grande">Sala Grande</SelectItem>
                        <SelectItem value="sala_externa">Sala Externa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive" 
                    onClick={() => removeSchedule(index)}
                    title="Remover horário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
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