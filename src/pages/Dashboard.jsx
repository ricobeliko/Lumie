import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Clock, DollarSign, Users, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency, formatDuration, ROOM_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/time';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = React.useState('month');

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', user?.email],
    queryFn: () => base44.entities.Appointment.filter({ professional_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', user?.email],
    queryFn: () => base44.entities.Patient.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const stats = useMemo(() => {
    const now = new Date();
    let start, end;
    if (period === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    const filtered = appointments.filter((a) => {
      const d = new Date(a.date);
      return d >= start && d <= end;
    });

    const realized = filtered.filter((a) => a.status === 'realizado');
    const totalMinutes = realized.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
    const totalValue = realized.reduce((sum, a) => sum + (a.total_value || 0), 0);
    const scheduled = filtered.filter((a) => a.status === 'agendado').length;

    return { totalMinutes, totalValue, scheduled, total: filtered.length, realized: realized.length };
  }, [appointments, period]);

  const todayAppointments = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appointments
      .filter((a) => a.date === today && a.status !== 'cancelado')
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [appointments]);

  return (
    <div>
      <PageHeader
        title={`Olá, ${user?.full_name?.split(' ')[0] || 'Profissional'}`}
        subtitle={format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
      />

      <Tabs value={period} onValueChange={setPeriod} className="mb-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="week">Esta semana</TabsTrigger>
          <TabsTrigger value="month">Este mês</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Horas Atendidas" value={formatDuration(stats.totalMinutes)} icon={Clock} />
        <StatCard title="Faturamento" value={formatCurrency(stats.totalValue)} icon={DollarSign} />
        <StatCard title="Agendamentos" value={stats.scheduled} icon={Calendar} subtitle="pendentes" />
        <StatCard title="Pacientes" value={patients.length} icon={Users} subtitle="cadastrados" />
      </div>

      <Card className="p-5 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Atendimentos de hoje</h2>
        {todayAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum atendimento para hoje.</p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium text-sm text-foreground">{apt.patient_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {apt.start_time} – {apt.end_time} · {ROOM_LABELS[apt.room]}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className={STATUS_COLORS[apt.status]}>
                  {STATUS_LABELS[apt.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}