/**
 * Admin Home – Dashboard Analytics + persistent Live Fleet Map.
 * Map is always visible so admin can monitor all ambulances at once.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Heart,
  Stethoscope,
  Calendar,
  BedDouble,
  Ambulance,
  CalendarDays,
  CalendarCheck,
  Droplets,
  Pill,
  MapPin,
  Maximize2,
} from 'lucide-react';
import { Card } from '../../components/common';
import { useAdminDashboardStats } from '../../hooks/useAdminApi';
import { useFleetTracking } from '../../features/admin/hooks/useFleetTracking';
import FleetTrackingMap from '../../features/admin/components/FleetTrackingMap';
import FleetTripDetailModal from '../../features/admin/components/FleetTripDetailModal';

function formatNum(n) {
  if (n == null || Number.isNaN(n)) return '0';
  return Number(n).toLocaleString();
}

export default function AdminHome() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const { data: stats, isLoading, error } = useAdminDashboardStats();
  const { vehicles, stats: fleetStats, isLoading: fleetLoading, refetch: refetchFleet } = useFleetTracking();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            Dashboard Analytics
          </h1>
          <p className="mt-1 text-text-secondary">
            Real-time system overview and key metrics
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-surface-muted" />
              <div className="mt-2 h-4 w-24 rounded bg-surface-muted" />
              <div className="mt-2 h-8 w-16 rounded bg-surface-muted" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            Dashboard Analytics
          </h1>
          <p className="mt-1 text-text-secondary">
            Real-time system overview and key metrics
          </p>
        </div>
        <Card className="border-error/30 bg-error/5">
          <p className="text-text-primary">
            Failed to load dashboard: {error.message}
          </p>
        </Card>
      </div>
    );
  }

  const s = stats || {};
  const statCards = [
    {
      label: 'Total Users',
      value: formatNum(s.totalUsers),
      icon: Users,
      iconBg: 'bg-icon-blue',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Total Patients',
      value: formatNum(s.totalPatients),
      icon: Heart,
      iconBg: 'bg-icon-purple',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Total Doctors',
      value: formatNum(s.totalDoctors),
      icon: Stethoscope,
      iconBg: 'bg-icon-teal',
      iconColor: 'text-primary',
    },
    {
      label: 'Appointments Today',
      value: formatNum(s.appointmentsToday),
      icon: Calendar,
      iconBg: 'bg-icon-orange',
      iconColor: 'text-orange-600',
    },
    {
      label: 'ICU Beds Available',
      value: `${s.icuBedsAvailable ?? 0}/${s.icuBedsTotal ?? 0}`,
      icon: BedDouble,
      iconBg: 'bg-icon-green',
      iconColor: 'text-success',
      progress:
        (s.icuBedsTotal && s.icuBedsTotal > 0)
          ? { current: s.icuBedsAvailable ?? 0, total: s.icuBedsTotal }
          : null,
    },
    {
      label: 'Ambulances Available',
      value: `${s.ambulancesAvailable ?? 0}/${s.ambulancesTotal ?? 0}`,
      sub: s.ambulancesOnDuty != null ? `On Trip: ${s.ambulancesOnDuty}` : undefined,
      icon: Ambulance,
      iconBg: 'bg-icon-pink',
      iconColor: 'text-pink-600',
    },
    {
      label: 'This Week',
      value: formatNum(s.appointmentsThisWeek),
      sub: 'Appointments',
      icon: CalendarDays,
      iconBg: 'bg-icon-pink',
      iconColor: 'text-pink-600',
    },
    {
      label: 'This Month',
      value: formatNum(s.appointmentsThisMonth),
      sub: 'Appointments',
      icon: CalendarCheck,
      iconBg: 'bg-icon-indigo',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'OPD Today',
      value: formatNum(s.opdToday),
      icon: Stethoscope,
      iconBg: 'bg-icon-teal',
      iconColor: 'text-primary',
    },
    {
      label: 'Open Invoices',
      value: formatNum(s.openInvoices),
      icon: Calendar,
      iconBg: 'bg-icon-orange',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Pending Lab',
      value: formatNum(s.pendingLabOrders),
      icon: Pill,
      iconBg: 'bg-icon-blue',
      iconColor: 'text-blue-600',
    },
    {
      label: 'In Labour',
      value: formatNum(s.inLabour),
      sub: `Deliveries MTD: ${formatNum(s.deliveriesThisMonth)}`,
      icon: Heart,
      iconBg: 'bg-icon-pink',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          Dashboard Analytics
        </h1>
        <p className="mt-1 text-text-secondary">
          Real-time system overview and key metrics
        </p>
      </div>

      

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 flex-col gap-2">
                  <div
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <p className="text-sm font-medium text-text-secondary">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-text-primary">
                    {card.value}
                  </p>
                  {card.sub && (
                    <p className="text-xs text-text-muted">{card.sub}</p>
                  )}
                  {card.progress && (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{
                          width: `${(card.progress.current / card.progress.total) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
        {/* Persistent Live Fleet Map – always visible */}
      <Card hover={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Live Fleet Map
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetchFleet()}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-muted"
            >
              Refresh
            </button>
            <Link
              to="/admin/fleet"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Full map
            </Link>
          </div>
        </div>
        {fleetLoading ? (
          <div className="flex h-[42vh] min-h-[280px] items-center justify-center bg-surface-muted">
            <p className="text-text-muted">Loading fleet…</p>
          </div>
        ) : (
          <FleetTrackingMap
            vehicles={vehicles}
            stats={fleetStats}
            onVehicleClick={setSelectedVehicle}
            className="h-[42vh] min-h-[280px] w-full border-0"
          />
        )}
      </Card>
      <FleetTripDetailModal
        open={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        vehicle={selectedVehicle}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card hover={false}>
          <h2 className="text-lg font-semibold text-text-primary">
            Appointment Trends
          </h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar className="h-4 w-4 text-icon-orange" />
              <span>Today: <strong className="text-text-primary">{formatNum(s.appointmentsToday)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <CalendarDays className="h-4 w-4 text-icon-pink" />
              <span>This week: <strong className="text-text-primary">{formatNum(s.appointmentsThisWeek)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <CalendarCheck className="h-4 w-4 text-icon-indigo" />
              <span>This month: <strong className="text-text-primary">{formatNum(s.appointmentsThisMonth)}</strong></span>
            </div>
          </div>
        </Card>
        <Card hover={false}>
          <h2 className="text-lg font-semibold text-text-primary">
            Blood Bank & Pharmacy
          </h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <Droplets className="h-4 w-4 text-red-500" />
              <span>Blood units in stock: <strong className="text-text-primary">{formatNum(s.totalBloodUnits)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Pill className="h-4 w-4 text-primary" />
              <span>Pending prescriptions: <strong className="text-text-primary">{formatNum(s.pendingPrescriptions)}</strong></span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
