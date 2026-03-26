import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, addMonths } from 'date-fns';
import { calculateDurationMinutes, calculateValue } from '@/lib/utils/time';

export default function RenewSchedulesDialog({ open, onOpenChange, patients, allAppointments, user, onGenerate }) {
  const [monthOffset, setMonthOffset] = useState("1"); // 0 = Mês atual, 1 = Próximo mês
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtra apenas pacientes que possuem horários fixos cadastrados
  const eligiblePatients = useMemo(() => {
    return patients.filter(p => p.schedules && p.schedules.length > 0);
  }, [patients]);

  // Marca todos os pacientes por padrão quando o modal abre
  useEffect(() => {
    if (open) {
      setSelectedPatients(eligiblePatients.map(p => p.id));
      setIsProcessing(false);
    }
  }, [open, eligiblePatients]);

  const togglePatient = (patientId) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) ? prev.filter(id => id !== patientId) : [...prev, patientId]
    );
  };

  const handleGenerate = () => {
    setIsProcessing(true);
    const targetDate = addMonths(new Date(), Number.parseInt(monthOffset));
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);
    const allDays = eachDayOfInterval({ start, end });

    const newAppointments = [];

    selectedPatients.forEach(patientId => {
      const patient = eligiblePatients.find(p => p.id === patientId);
      if (!patient) return;

      patient.schedules.forEach(sched => {
        const targetDayOfWeek = Number.parseInt(sched.dayOfWeek);
        
        // Encontra todos os dias no mês alvo que caem neste dia da semana
        const matchingDates = allDays.filter(d => getDay(d) === targetDayOfWeek);

        matchingDates.forEach(dateObj => {
          const dateStr = format(dateObj, 'yyyy-MM-dd');
          
          // Verifica se JÁ EXISTE um agendamento para este paciente, neste dia e hora
          // Isso evita criar duplicatas caso o usuário clique em "Gerar" duas vezes no mês
          const isDuplicate = allAppointments.some(a => 
            a.date === dateStr && 
            a.patient_id === patient.id &&
            a.start_time === sched.start_time &&
            a.status !== 'cancelado'
          );

          if (!isDuplicate) {
            const dur = calculateDurationMinutes(sched.start_time, sched.end_time);
            const val = calculateValue(dur, patient.hourly_rate || 0);

            newAppointments.push({
              patient_id: patient.id,
              patient_name: patient.name,
              room: sched.room,
              date: dateStr,
              start_time: sched.start_time,
              end_time: sched.end_time,
              duration_minutes: dur,
              total_value: val,
              professional_email: user.email,
              professional_name: user.full_name,
              status: 'agendado',
            });
          }
        });
      });
    });

    onGenerate(newAppointments);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Renovar Horários Fixos</DialogTitle>
          <DialogDescription>
            Gere os agendamentos reais na agenda baseados nos horários fixos dos seus pacientes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Mês Alvo</Label>
            <Select value={monthOffset} onValueChange={setMonthOffset}>
              <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Este Mês ({format(new Date(), 'MMMM')})</SelectItem>
                <SelectItem value="1">Próximo Mês ({format(addMonths(new Date(), 1), 'MMMM')})</SelectItem>
                <SelectItem value="2">Daqui a 2 Meses ({format(addMonths(new Date(), 2), 'MMMM')})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-3 block">Selecione os Pacientes</Label>
            {eligiblePatients.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded">
                Nenhum paciente com horário fixo cadastrado.
              </p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto p-1 border border-border rounded-md bg-secondary/10">
                {eligiblePatients.map(patient => (
                  <div key={patient.id} className="flex items-center space-x-2 p-2 hover:bg-secondary/20 rounded transition-colors">
                    <Checkbox 
                      id={`chk-${patient.id}`} 
                      checked={selectedPatients.includes(patient.id)}
                      onCheckedChange={() => togglePatient(patient.id)}
                    />
                    <Label htmlFor={`chk-${patient.id}`} className="flex-1 cursor-pointer font-normal">
                      {patient.name}
                      <span className="block text-xs text-muted-foreground">
                        {patient.schedules.length} horário(s) na semana
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={selectedPatients.length === 0 || isProcessing}>
            {isProcessing ? 'Gerando...' : 'Gerar Agendamentos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}