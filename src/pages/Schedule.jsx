import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Calendar, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import AppointmentFormDialog from '@/components/appointments/AppointmentFormDialog';
import { ROOM_LABELS, STATUS_LABELS, STATUS_COLORS, formatDuration, formatCurrency } from '@/lib/utils/time';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7h to 19h

export default function Schedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // All appointments for room conflict detection
  const { data: allAppointments = [] } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => base44.entities.Appointment.list(),
  });

  // User's appointments
  const { data: myAppointments = [] } = useQuery({
    queryKey: ['appointments', user?.email],
    queryFn: () => base44.entities.Appointment.filter({ professional_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', user?.email],
    queryFn: () => base44.entities.Patient.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['all-appointments'] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['all-appointments'] });
      setDialogOpen(false);
      setEditingApt(null);
    },
  });

  const handleSave = (data) => {
    if (editingApt) {
      updateMutation.mutate({ id: editingApt.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleStatusChange = (apt, newStatus) => {
    updateMutation.mutate({ id: apt.id, data: { status: newStatus } });
  };

  const navigate = (direction) => {
    const days = view === 'week' ? 7 : 1;
    setCurrentDate((d) => addDays(d, direction * days));
  };

  const displayDays = view === 'week' ? weekDays : [currentDate];

  // Appointments for current view (all users, for room visualization)
  const viewAppointments = useMemo(() => {
    return allAppointments.filter((a) => {
      if (a.status === 'cancelado') return false;
      return displayDays.some((d) => a.date === format(d, 'yyyy-MM-dd'));
    });
  }, [allAppointments, displayDays]);

  const myAppointmentById = useMemo(() => {
    return new Map(myAppointments.map((a) => [a.id, a]));
  }, [myAppointments]);

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Calendário compartilhado de salas"
        actions={
          <Button onClick={() => { setEditingApt(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Agendar
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())} className="text-sm">
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground ml-2">
            {view === 'week'
              ? `${format(weekDays[0], "d MMM", { locale: ptBR })} – ${format(weekDays[6], "d MMM yyyy", { locale: ptBR })}`
              : format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
          </span>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto border border-border rounded-lg bg-card">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `60px repeat(${displayDays.length}, 1fr)` }}>
            <div className="p-2 border-r border-border" />
            {displayDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={`p-3 text-center border-r border-border last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                  <p className="text-xs text-muted-foreground uppercase">{format(day, 'EEE', { locale: ptBR })}</p>
                  <p className={`text-lg font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time slots */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: `60px repeat(${displayDays.length}, 1fr)` }}>
              <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r border-border">
                {String(hour).padStart(2, '0')}:00
              </div>
              {displayDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const slotApts = viewAppointments.filter((a) => {
                  if (a.date !== dayStr) return false;
                  const startH = parseInt(a.start_time.split(':')[0]);
                  return startH === hour;
                });

                return (
                  <div key={day.toISOString()} className="p-1 border-r border-border last:border-r-0 min-h-[52px] relative">
                    {slotApts.map((apt) => {
                      const isMine = apt.ownerUid
                        ? apt.ownerUid === user?.uid
                        : apt.professional_email === user?.email;

                      const displayPatientName = isMine
                        ? (myAppointmentById.get(apt.id)?.patient_name || apt.patient_name || 'Atendimento')
                        : 'Ocupado';

                      const displayRoomLine = `${apt.start_time}-${apt.end_time} · ${
                        apt.room === 'sala_pequena' ? 'SP' : 'SG'
                      }`;
                      return (
                        <DropdownMenu key={apt.id}>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`w-full text-left p-1.5 rounded text-xs mb-0.5 transition-colors ${
                                apt.room === 'sala_pequena'
                                  ? 'bg-primary/15 text-primary hover:bg-primary/25 border-l-2 border-primary'
                                  : 'bg-accent/20 text-accent-foreground hover:bg-accent/30 border-l-2 border-accent'
                              } ${!isMine ? 'opacity-60' : ''}`}
                            >
                              <p className="font-medium truncate">{displayPatientName}</p>
                              <p className="opacity-75">{displayRoomLine}</p>
                            </button>
                          </DropdownMenuTrigger>
                          {isMine && (
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => {
                                const full = myAppointmentById.get(apt.id);
                                setEditingApt(full || apt);
                                setDialogOpen(true);
                              }}>
                                Editar
                              </DropdownMenuItem>
                              {apt.status === 'agendado' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(apt, 'realizado')}>
                                  <Check className="w-4 h-4 mr-2" /> Marcar como realizado
                                </DropdownMenuItem>
                              )}
                              {apt.status !== 'cancelado' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(apt, 'cancelado')} className="text-destructive">
                                  <X className="w-4 h-4 mr-2" /> Cancelar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          )}
                        </DropdownMenu>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/15 border-l-2 border-primary" />
          Sala Pequena
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent/20 border-l-2 border-accent" />
          Sala Grande
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted opacity-60" />
          Outro profissional
        </div>
      </div>

      <AppointmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editingApt}
        patients={patients}
        allAppointments={allAppointments}
        user={user}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}