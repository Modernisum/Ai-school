import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SecondaryNav = ({ type, tabs }) => {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 500);

    useEffect(() => {
        const handleResize = () => {
            setIsCollapsed(window.innerWidth < 500);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getNavWidth = () => {
        return isCollapsed ? '42px' : '140px';
    }

    return (
        <motion.div
            initial={false}
            animate={{ width: getNavWidth() }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="sticky left-0 top-0 h-full border-r border-white/5 bg-black/20 backdrop-blur-xl flex flex-col p-1.5 space-y-0.5 z-30 ml-1 overflow-y-auto overflow-x-hidden no-scrollbar"
        >
            {tabs.map((tab) => {
                const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
                return (
                    <NavLink
                        key={tab.label}
                        to={tab.path}
                        className={`flex items-center gap-2.5 px-2 py-2 transition-all duration-200 group relative rounded-md ${
                            isActive 
                                ? tab.color 
                                    ? `bg-opacity-10 font-bold shadow-[0_0_15px_rgba(0,0,0,0.1)]`
                                    : 'bg-primary/10 text-primary font-bold shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                        style={isActive && tab.color ? { backgroundColor: `${tab.color}1A`, color: tab.color } : {}}
                        title={isCollapsed ? tab.label : ''}
                    >
                        {tab.icon && (
                            <tab.icon 
                                size={13} 
                                className={`flex-shrink-0 transition-colors ${isActive ? '' : 'text-slate-500 group-hover:text-slate-300'}`}
                                style={isActive && tab.color ? { color: tab.color } : (isActive ? {} : {})}
                            />
                        )}
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-[10px] font-semibold tracking-wide truncate"
                                >
                                    {tab.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </NavLink>
                );
            })}
        </motion.div>
    );
};

export default SecondaryNav;
