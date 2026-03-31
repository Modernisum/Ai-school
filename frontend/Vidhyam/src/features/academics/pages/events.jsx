import React from 'react';
import { Calendar, Plus, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EventsPage() {
  const events = [
    { id: 1, title: 'Annual Sports Day', date: '2026-04-15', location: 'School Ground', category: 'Sports' },
    { id: 2, title: 'Science Exhibition', date: '2026-05-10', location: 'Main Hall', category: 'Academic' },
    { id: 3, title: 'Parent-Teacher Meeting', date: '2026-03-25', location: 'Classrooms', category: 'Meeting' },
  ];

  return (
    <div className="min-h-full p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Calendar size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">School Events</h1>
            <p className="text-sm text-slate-500">Manage and view upcoming school activities</p>
          </div>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-indigo-600/20">
          <Plus size={18} />
          <span>Add Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-5 hover-card cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                {event.category}
              </span>
              <div className="text-slate-500 group-hover:text-white transition-colors">
                <Calendar size={18} />
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
              {event.title}
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar size={14} className="text-slate-500" />
                <span>{new Date(event.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Search size={14} className="text-slate-500" />
                <span>{event.location}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
              <button className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                View Details →
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
