import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Plus, Search, Filter, MapPin, Tag, Info, Activity, Star, Users, Map, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

import GlassCard from '../../../components/ui/GlassCard';
import FormWidget from '../../../components/ui/FormWidget';
import PageHeader from '../../../components/ui/PageHeader';
import FilterWidget from '../../../components/ui/FilterWidget';
import KPIWidget from '../../../components/ui/KPIWidget';
import KPITile from '../../../components/ui/KPITile';

export default function EventsPage() {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  
  const events = [
    { id: 1, title: 'Annual Sports Day', date: '2026-04-15', location: 'School Ground', category: 'Sports' },
    { id: 2, title: 'Science Exhibition', date: '2026-05-10', location: 'Main Hall', category: 'Academic' },
    { id: 3, title: 'Parent-Teacher Meeting', date: '2026-03-25', location: 'Classrooms', category: 'Meeting' },
  ];

  const { control, handleSubmit, reset } = useForm();

  const handleAddEvent = (data) => {
    console.log('New Event:', data);
    toast.success('Event scheduled successfully');
    setIsAdding(false);
    reset();
  };

  return (
    <div className="max-w-full p-1 space-y-4">
      <PageHeader
        title="Academic"
        accentTitle="Events"
        subtitle="School activities and scheduling calendar"
        icon={Calendar}
        actions={[
          {
            label: "Add Event",
            onClick: () => setIsAdding(true),
            variant: "primary",
            size: "sm",
            icon: Plus
          }
        ]}
      />

      <KPIWidget columns={4}>
          <KPITile label="Total Events" value={events.length} sub="Registered activities" icon={Calendar} color="primary" />
          <KPITile label="Upcoming Events" value={events.filter(e => new Date(e.date) > new Date()).length} sub="Scheduled events" icon={Activity} color="success" />
          <KPITile label="Staff Allocated" value="85%" sub="Staff assignment index" icon={Users} color="accent" />
          <KPITile label="Venue Utilization" value="High" sub="Auditorium & Halls" icon={Map} color="warning" />
      </KPIWidget>

      <div className="bg-white/[0.02] p-2 rounded-xl border border-[var(--glass-border)]">
        <FilterWidget
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search events..."
          customActions={[
            { label: "Category", icon: Tag, color: "indigo", onClick: () => {} },
            { label: "Venue", icon: MapPin, color: "slate", onClick: () => {} }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {events.map((event, index) => (
          <GlassCard key={event.id} hover delay={index * 0.03} className="group overflow-hidden flex flex-col h-full" glowColor="primary" dense>
            <div className="p-3 flex flex-col h-full">
              <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-micro font-semibold uppercase tracking-wider border border-primary/20 leading-none">
                  {event.category}
                </span>
                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 text-[var(--text-muted)] group-hover:text-primary transition-colors">
                  <Star size={10} />
                </div>
              </div>
              
              <h3 className="text-xs font-semibold text-[var(--text-main)] mb-2 group-hover:text-primary transition-colors tracking-tight truncate">
                {event.title}
              </h3>
              
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-2 text-micro font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                  <Clock size={10} className="text-primary/60" />
                  <span className="truncate">{new Date(event.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                </div>
                <div className="flex items-center gap-2 text-micro font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                  <MapPin size={10} className="text-accent/60" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>

              <div className="mt-auto pt-2.5 border-t border-[var(--glass-border)] flex items-center justify-between">
                <div className="flex -space-x-1.5">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-5 h-5 rounded-full border border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                        <Users size={10} className="text-slate-500" />
                     </div>
                   ))}
                </div>
                <button className="text-micro font-semibold text-primary tracking-wide hover:underline">
                  View Details
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[120] flex items-center justify-end p-8 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md pointer-events-auto"
              onClick={() => { setIsAdding(false); reset(); }}
            />
            <motion.div 
              initial={{ x: 100, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: 100, opacity: 0 }} 
              className="relative w-full max-w-xl z-10 pointer-events-auto h-fit max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <FormWidget
                title="Add Event"
                description="Register academic schedules and campus activity details"
                sections={[{
                  fields: [
                    { name: 'title', label: 'Event Name', type: 'text', placeholder: 'e.g. Annual Sports Meet 2026', required: true, labelIcon: Activity },
                    { name: 'category', label: 'Category', type: 'select', options: ['Sports', 'Academic', 'Meeting', 'Cultural', 'Holiday'], required: true, labelIcon: Tag },
                    { name: 'date', label: 'Scheduled Date', type: 'date', required: true, labelIcon: Calendar },
                    { name: 'location', label: 'Venue Location', type: 'text', placeholder: 'e.g. Main Auditorium', labelIcon: MapPin },
                    { name: 'description', label: 'Event Details', type: 'textarea', placeholder: 'Provide specific instructions or details...' }
                  ]
                }]}
                control={control}
                onSubmit={handleSubmit(handleAddEvent)}
                onCancel={() => { setIsAdding(false); reset(); }}
                submitLabel="Create Event"
                dense
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
