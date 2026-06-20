import React from "react";
import { motion } from "framer-motion";
import { 
  Table, Presentation, FileText, Database, 
  BarChart, Wallet, ChevronRight
} from "lucide-react";

export default function AiContextSidebar({ handleStudioAction }) {
  const tools = [
    { id: 'data_table', label: 'Data Table', icon: Table },
    { id: 'slide_deck', label: 'Slide Deck', icon: Presentation, beta: true },
    { id: 'reports', label: 'Detailed Report', icon: FileText },
    { id: 'db_analyzer', label: 'DB Analyzer', icon: Database },
    { id: 'chart', label: 'Graph / Chart', icon: BarChart },
    { id: 'fee_analytics', label: 'Fee Analytics', icon: Wallet },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full lg:w-72 flex flex-col gap-2 shrink-0"
    >
      <div className="border border-[var(--glass-border)] rounded-2xl bg-[#1e1e20] p-4 flex-1 flex flex-col relative overflow-hidden">
        <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center justify-between">
          Studio Templates
          <div className="w-4 h-4 border border-white/20 rounded-sm"></div>
        </h3>
        
        <p className="text-xs text-white/60 mb-4">
          Click a template to tag your query, then type your specific requirement.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleStudioAction(tool.id)}
              className="flex items-center justify-between p-3 rounded-xl bg-[#2a2a2c] hover:bg-[#323235] border border-transparent hover:border-white/10 transition-all text-left group"
            >
              <div className="flex flex-col gap-2">
                <tool.icon size={16} className="text-white/60 group-hover:text-white/90 transition-colors" />
                <span className="text-[11px] font-medium text-white/80 group-hover:text-white flex items-center gap-1.5 whitespace-nowrap">
                  {tool.label}
                  {tool.beta && <span className="px-1 py-0.5 rounded bg-white/10 text-[8px] font-bold uppercase text-white/70">BETA</span>}
                </span>
              </div>
              <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors shrink-0">
                <ChevronRight size={12} className="text-white/40 group-hover:text-white/80" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
