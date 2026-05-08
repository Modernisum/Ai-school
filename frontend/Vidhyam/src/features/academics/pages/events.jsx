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
    toast.success('Activity protocol initiated');
    setIsAdding(false);
    reset();
  };

  return (
    <div className="max-w-full p-1 space-y-2">
      <PageHeader
        title="ACADEMIC"
        accentTitle="EVENTS"
        subtitle="School Activity Protocol & Scheduling"
        icon={Calendar}
        actions={[
          {
            label: "LOG_ACTIVITY",
            onClick: () => setIsAdding(true),
            variant: "primary",
            size: "xs",
            icon: Plus
          }
        ]}
      />

      <KPIWidget columns={4}>
          <KPITile label="Total Registry" value={events.length} sub="Synchronized Activities" icon={Calendar} color="primary" />
          <KPITile label="Upcoming Pulse" value={events.filter(e => new Date(e.date) > new Date()).length} sub="Next 30 Days" icon={Activity} color="success" />
          <KPITile label="Network Load" value="85%" sub="Staff Allocation" icon={Users} color="accent" />
          <KPITile label="Venue Use" value="High" sub="Auditorium Utilization" icon={Map} color="warning" />
      </KPIWidget>

      <div className="bg-white/[0.02] p-2 rounded-xl border border-white/5">
        <FilterWidget
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="SCAN_ACTIVITY_PULSE..."
          customActions={[
            { label: "CATEGORY", icon: Tag, color: "indigo", onClick: () => {} },
            { label: "VENUE", icon: MapPin, color: "slate", onClick: () => {} }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {events.map((event, index) => (
          <GlassCard key={event.id} hover delay={index * 0.03} className="group overflow-hidden flex flex-col h-full" glowColor="primary" dense>
            <div className="p-2 flex flex-col h-full">
              <div className="flex items-start justify-between mb-2">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-micro font-black uppercase tracking-[0.2em] border border-primary/20 leading-none">
                  {event.category}
                </span>
                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 text-slate-700 group-hover:text-primary transition-colors">
                  <Star size={10} />
                </div>
              </div>
              
              <h3 className="text-xxs font-black text-white mb-2 group-hover:text-primary transition-colors tracking-tighter uppercase italic truncate">
                {event.title}
              </h3>
              
              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2 text-micro font-black text-slate-700 uppercase tracking-widest group-hover:text-slate-400">
                  <Clock size={10} className="text-primary/40" />
                  <span className="truncate">{new Date(event.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                </div>
                <div className="flex items-center gap-2 text-micro font-black text-slate-700 uppercase tracking-widest group-hover:text-slate-400">
                  <MapPin size={10} className="text-accent/40" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>

              <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between">
                <div className="flex -space-x-1.5">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-5 h-5 rounded-full border border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                        <Users size={10} className="text-slate-600" />
                     </div>
                   ))}
                </div>
                <button className="text-micro font-black text-primary uppercase tracking-[0.2em] italic group-hover:translate-x-0.5 transition-transform">
                  ACCESS →
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
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl pointer-events-auto"
              onClick={() => { setIsAdding(false); reset(); }}
            />
            <motion.div 
              initial={{ x: 100, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: 100, opacity: 0 }} 
              className="relative w-full max-w-xl z-10 pointer-events-auto h-fit max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <FormWidget
                title="LOG ACTIVITY"
                description="Register school activity protocols and temporal scheduling"
                sections={[{
                  fields: [
                    { name: 'title', label: 'Activity Name', type: 'text', placeholder: 'e.g. ANNUAL_SPORTS_MEET_26', required: true, labelIcon: Activity },
                    { name: 'category', label: 'Sector', type: 'select', options: ['Sports', 'Academic', 'Meeting', 'Cultural', 'Holiday'], required: true, labelIcon: Tag },
                    { name: 'date', label: 'Launch Vector', type: 'date', required: true, labelIcon: Calendar },
                    { name: 'location', label: 'Hub Location', type: 'text', placeholder: 'e.g. SECTOR_A_AUDITORIUM', labelIcon: MapPin },
                    { name: 'description', label: 'Mission Scope', type: 'textarea', placeholder: 'Detail the activity parameters...' }
                  ]
                }]}
                control={control}
                onSubmit={handleSubmit(handleAddEvent)}
                onCancel={() => { setIsAdding(false); reset(); }}
                submitLabel="INITIATE_PROTOCOL"
                dense
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
