import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { DollarSign, Clock, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { formatCurrency, formatDuration, ROOM_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/time';
import { toDateSafe } from '@/lib/utils/date';
import { buildUserAppointments } from '@/lib/utils/appointments';

export default function Financial() {
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = useState('month');
  const [patientFilter, setPatientFilter] = useState('all');

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', user?.uid],
    queryFn: () => base44.entities.Appointment.filter(),
    enabled: !!user?.uid,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', user?.uid],
    queryFn: () => base44.entities.Patient.list(),
    enabled: !!user?.uid,
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => base44.entities.Appointment.list(),
    enabled: !!user?.uid,
  });

  const patientRateById = useMemo(
    () => new Map(patients.map((p) => [p.id, Number(p.hourly_rate || 0)])),
    [patients]
  );

  const financeAppointments = useMemo(() => {
    return buildUserAppointments(appointments, allBookings, user, patientRateById);
  }, [appointments, allBookings, user?.uid, user?.email, patientRateById]);

  const filtered = useMemo(() => {
    const now = new Date();
    let start, end;
    if (periodFilter === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    return financeAppointments.filter((a) => {
      const d = toDateSafe(a.date);
      const inRange = !!d && d >= start && d <= end;
      const matchPatient = patientFilter === 'all' || a.patient_id === patientFilter;
      return inRange && matchPatient;
    });
  }, [financeAppointments, periodFilter, patientFilter]);

  const realized = filtered.filter((a) => a.status === 'realizado');
  const totalValue = realized.reduce((sum, a) => sum + (a.total_value || 0), 0);
  const totalMinutes = realized.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
  const avgPerSession = realized.length > 0 ? totalValue / realized.length : 0;

  const exportCSV = () => {
    const headers = ['Data', 'Paciente', 'Sala', 'Início', 'Término', 'Duração', 'Valor', 'Status'];
    const rows = filtered.map((a) => [
      a.date, a.patient_name, ROOM_LABELS[a.room], a.start_time, a.end_time,
      formatDuration(a.duration_minutes || 0), (a.total_value || 0).toFixed(2), STATUS_LABELS[a.status],
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Resumo financeiro e relatórios"
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>
        <Select value={patientFilter} onValueChange={setPatientFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos os pacientes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pacientes</SelectItem>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Faturado" value={formatCurrency(totalValue)} icon={DollarSign} />
        <StatCard title="Horas Atendidas" value={formatDuration(totalMinutes)} icon={Clock} />
        <StatCard title="Média por Sessão" value={formatCurrency(avgPerSession)} icon={TrendingUp} />
      </div>

      <Card className="border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Data</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead className="hidden sm:table-cell">Sala</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead className="hidden sm:table-cell">Duração</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum atendimento encontrado no período.
                  </TableCell>
                </TableRow>
              ) : (
                filtered
                  .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.start_time.localeCompare(a.start_time))
                  .map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="text-sm">{format(toDateSafe(apt.date) || new Date(), "dd/MM/yy")}</TableCell>
                      <TableCell className="font-medium text-sm">{apt.patient_name}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{ROOM_LABELS[apt.room]}</TableCell>
                      <TableCell className="text-sm">{apt.start_time} – {apt.end_time}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{formatDuration(apt.duration_minutes || 0)}</TableCell>
                      <TableCell className="font-medium text-sm">{formatCurrency(apt.total_value || 0)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[apt.status]}`}>
                          {STATUS_LABELS[apt.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}