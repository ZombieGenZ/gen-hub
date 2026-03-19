'use client';

import React from 'react';
import { Calendar, dateFnsLocalizer, ToolbarProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'vi': vi,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  events: VisitCalendarEvent[];
  date: Date;
  onNavigate: (newDate: Date) => void;
  onSelectEvent: (event: VisitCalendarEvent) => void;
}

interface VisitCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | string;
  resource: unknown;
}

export default function CalendarView({ events, date, onNavigate, onSelectEvent }: CalendarViewProps) {
  const getStatusTheme = (status: string) => {
    if (status === 'PENDING') {
      return {
        background: '#fef3c7',
        color: '#92400e',
        border: '#f59e0b',
      };
    }

    if (status === 'CONFIRMED') {
      return {
        background: '#d1fae5',
        color: '#065f46',
        border: '#10b981',
      };
    }

    if (status === 'CANCELLED') {
      return {
        background: '#ffe4e6',
        color: '#9f1239',
        border: '#f43f5e',
      };
    }

    return {
      background: '#e0f2fe',
      color: '#0c4a6e',
      border: '#06b6d4',
    };
  };

  const getEventPropGetter = (event: VisitCalendarEvent) => {
    const theme = getStatusTheme(event.status);

    return {
      style: {
        backgroundColor: theme.background,
        borderRadius: '8px',
        color: theme.color,
        borderLeft: `3px solid ${theme.border}`,
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        borderRight: '1px solid rgba(148, 163, 184, 0.2)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 4px 14px -10px rgba(15, 23, 42, 0.28)',
        display: 'block',
        padding: 0,
      }
    };
  };

  const CustomEvent = ({ event }: { event: VisitCalendarEvent }) => (
    <div className="h-full rounded-[inherit] px-2 py-1.5 leading-tight">
      <p className="truncate text-[11px] font-semibold">{event.title}</p>
      <p className="mt-0.5 text-[10px] font-medium opacity-80">{format(event.start, 'HH:mm')}</p>
    </div>
  );

  const CustomToolbar = ({ label, onNavigate, onView, view }: ToolbarProps<VisitCalendarEvent, object>) => (
    <div className="rbc-toolbar mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm dark:border-border dark:bg-card">
      <div className="rbc-btn-group flex gap-1">
        <button onClick={() => onNavigate('PREV')} type="button">Trước</button>
        <button onClick={() => onNavigate('TODAY')} type="button">Hôm nay</button>
        <button onClick={() => onNavigate('NEXT')} type="button">Tiếp</button>
      </div>
      <span className="rbc-toolbar-label text-sm font-semibold text-foreground">{label}</span>
      <div className="rbc-btn-group flex gap-1">
        <button onClick={() => onView('month')} className={view === 'month' ? 'rbc-active' : ''} type="button">Tháng</button>
        <button onClick={() => onView('week')} className={view === 'week' ? 'rbc-active' : ''} type="button">Tuần</button>
        <button onClick={() => onView('day')} className={view === 'day' ? 'rbc-active' : ''} type="button">Ngày</button>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full">
      <style>{`
        .rbc-calendar {
          font-family: inherit;
          color: #475569;
        }
        .rbc-btn-group > button {
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          background: #ffffff;
          font-size: 12px;
          line-height: 1;
          padding: 8px 12px;
        }
        .rbc-btn-group > button:hover, .rbc-btn-group > button.rbc-active {
          background-color: #ecfeff;
          color: #0f766e;
          border-color: #99f6e4;
        }
        .rbc-header {
          border-bottom: 1px solid #e2e8f0 !important;
          border-left: 1px solid #e2e8f0 !important;
          background: #f8fafc;
          color: #64748b;
          padding: 10px 0;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background-color: #ffffff;
        }
        .rbc-day-bg, .rbc-month-row, .rbc-time-content, .rbc-time-header-content, .rbc-timeslot-group {
          border-color: #e2e8f0;
        }
        .rbc-off-range-bg {
          background-color: #f8fafc;
        }
        .rbc-off-range {
          color: #94a3b8;
        }
        .rbc-today {
          background-color: #f0fdfa;
        }
        .rbc-event {
          min-height: 38px;
        }
        .rbc-day-slot .rbc-event {
          border: none !important;
        }
        .rbc-time-view .rbc-time-gutter,
        .rbc-time-view .rbc-allday-cell,
        .rbc-time-view .rbc-time-header-gutter {
          background: #f8fafc;
          color: #94a3b8;
          font-size: 11px;
        }
        .rbc-toolbar button:active, .rbc-toolbar button.rbc-active:hover, .rbc-toolbar button.rbc-active:focus {
           background-color: #ccfbf1;
           color: #115e59;
           box-shadow: none;
        }
        .dark .rbc-btn-group > button {
          background: oklch(0.205 0 0);
          border-color: oklch(1 0 0 / 15%);
          color: oklch(0.9 0 0);
        }
        .dark .rbc-btn-group > button:hover,
        .dark .rbc-btn-group > button.rbc-active,
        .dark .rbc-toolbar button:active,
        .dark .rbc-toolbar button.rbc-active:hover,
        .dark .rbc-toolbar button.rbc-active:focus {
          background: oklch(0.3 0.04 186 / 0.4);
          border-color: oklch(0.5 0.09 186 / 0.65);
          color: oklch(0.96 0.01 186);
        }
        .dark .rbc-month-view,
        .dark .rbc-time-view,
        .dark .rbc-agenda-view,
        .dark .rbc-header,
        .dark .rbc-day-bg,
        .dark .rbc-month-row,
        .dark .rbc-time-content,
        .dark .rbc-time-header-content,
        .dark .rbc-timeslot-group {
          border-color: oklch(1 0 0 / 12%);
        }
        .dark .rbc-header,
        .dark .rbc-time-view .rbc-time-gutter,
        .dark .rbc-time-view .rbc-allday-cell,
        .dark .rbc-time-view .rbc-time-header-gutter {
          background: oklch(0.23 0 0);
          color: oklch(0.72 0 0);
        }
        .dark .rbc-month-view,
        .dark .rbc-time-view,
        .dark .rbc-agenda-view {
          background: oklch(0.19 0 0);
        }
        .dark .rbc-off-range-bg {
          background: oklch(0.23 0 0);
        }
        .dark .rbc-off-range {
          color: oklch(0.58 0 0);
        }
        .dark .rbc-today {
          background: oklch(0.3 0.04 186 / 0.2);
        }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        date={date}
        onNavigate={onNavigate}
        onSelectEvent={onSelectEvent}
        culture="vi"
        views={['month', 'week', 'day']}
        defaultView="month"
        step={30}
        timeslots={2}
        eventPropGetter={getEventPropGetter}
        components={{
          toolbar: CustomToolbar,
          event: CustomEvent,
        }}
        messages={{
          next: "Tiếp",
          previous: "Trước",
          today: "Hôm nay",
          month: "Tháng",
          week: "Tuần",
          day: "Ngày",
          agenda: "Lịch trình",
          date: "Ngày",
          time: "Thời gian",
          event: "Sự kiện",
          noEventsInRange: "Không có sự kiện nào trong khoảng thời gian này.",
        }}
        showMultiDayTimes={true}
      />
    </div>
  );
}
