'use client';

import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import vi from 'date-fns/locale/vi';
import type { CalendarVisitEvent } from './types';
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
  events: CalendarVisitEvent[];
  date: Date;
  onNavigate: (newDate: Date) => void;
  onSelectEvent: (event: CalendarVisitEvent) => void;
}

export default function CalendarView({ events, date, onNavigate, onSelectEvent }: CalendarViewProps) {
  
  const getEventPropGetter = (event: CalendarVisitEvent) => {
    let backgroundColor = '#374151'; // default gray (COMPLETED/CANCELLED)
    
    if (event.status === 'PENDING') {
      backgroundColor = '#b45309'; // amber
    } else if (event.status === 'CONFIRMED') {
      backgroundColor = '#15803d'; // green
    } else if (event.status === 'CANCELLED') {
      backgroundColor = '#991b1b'; // red
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: '#fff',
        border: 'none',
        display: 'block'
      }
    };
  };

  return (
    <div className="h-full w-full">
      <style>{`
        .rbc-calendar {
          font-family: inherit;
          color: var(--text-secondary);
        }
        .rbc-btn-group > button {
          color: var(--text-secondary);
          border-color: var(--border-primary);
        }
        .rbc-btn-group > button:hover, .rbc-btn-group > button.rbc-active {
          background-color: var(--background-tertiary);
          color: white;
          border-color: var(--accent-primary);
        }
        .rbc-header {
          border-bottom: 1px solid var(--border-primary) !important;
          border-left: 1px solid var(--border-primary) !important;
          padding: 8px 0;
          font-weight: 600;
        }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          overflow: hidden;
          background-color: var(--background-primary);
        }
        .rbc-day-bg, .rbc-month-row, .rbc-time-content {
          border-color: var(--border-primary);
        }
        .rbc-off-range-bg {
          background-color: rgba(255, 255, 255, 0.02);
        }
        .rbc-today {
          background-color: rgba(0, 153, 255, 0.05);
        }
        .rbc-time-slot, .rbc-time-header-content {
          border-color: var(--border-primary);
        }
        .rbc-timeslot-group {
          border-bottom-color: var(--border-primary);
        }
        .rbc-event {
          padding: 2px 6px;
          font-size: 12px;
        }
        .rbc-toolbar button:active, .rbc-toolbar button.rbc-active:hover, .rbc-toolbar button.rbc-active:focus {
           background-color: var(--accent-primary-muted);
           color: var(--accent-primary);
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
