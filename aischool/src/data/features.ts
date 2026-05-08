export interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  bullets: string[];
  screenshot?: string;
}

export interface FeatureCategory {
  id: string;
  title: string;
  subtitle: string;
  features: Feature[];
}

export const featureCategories: FeatureCategory[] = [
  {
    id: "core-operations",
    title: "Core Operations Automation",
    subtitle:
      "From attendance to finances — automate every operational layer of your school.",
    features: [
      {
        id: "attendance",
        icon: "📋",
        title: "AI Attendance Automation",
        description:
          "Face-recognition powered attendance with 99.7% accuracy. No manual roll calls, no proxy attendance. Real-time dashboards for administrators.",
        bullets: [
          "AI face recognition — instant marking",
          "Auto-sync with parent notifications",
          "Monthly analytics & trend reports",
          "Integration with payroll for salary computation",
        ],
      },
      {
        id: "salary",
        icon: "💰",
        title: "Employee Salary Automation",
        description:
          "End-to-end payroll processing with tax computation, bank integration, and automated payslips. Zero manual intervention.",
        bullets: [
          "Auto-calculated salaries with deduction logic",
          "Direct bank transfer integration",
          "Digital payslips with tax breakdowns",
          "Leave-encashment and overtime computation",
        ],
      },
      {
        id: "inventory",
        icon: "📦",
        title: "Material Inventory Management",
        description:
          "Smart inventory tracking with auto-reorder alerts. Never run out of supplies again with predictive stock management.",
        bullets: [
          "Real-time stock level monitoring",
          "Auto-reorder below threshold",
          "Vendor management & purchase orders",
          "Consumption analytics & cost tracking",
        ],
      },
      {
        id: "space",
        icon: "🏫",
        title: "Space Management",
        description:
          "Intelligent room and facility booking system. Prevent conflicts, optimize utilization, and manage infrastructure efficiently.",
        bullets: [
          "Classroom & facility booking calendar",
          "Conflict detection & auto-suggestion",
          "Usage analytics & occupancy reports",
          "Maintenance scheduling & tracking",
        ],
      },
      {
        id: "finance",
        icon: "📊",
        title: "Financial Automation",
        description:
          "Complete financial management from fee collection to expense tracking. Automated reconciliation, audit trails, and compliance reports.",
        bullets: [
          "Automated fee collection & reminders",
          "Expense tracking with receipt upload",
          "P&L statements & balance sheets",
          "Audit-ready compliance reports",
        ],
      },
    ],
  },
  {
    id: "ai-capabilities",
    title: "AI Capabilities",
    subtitle:
      "Built-in artificial intelligence that learns your school's patterns and optimizes processes.",
    features: [
      {
        id: "auto-exam",
        icon: "🧠",
        title: "Auto-Exam Assignment",
        description:
          "AI creates personalized question papers based on student proficiency levels, curriculum standards, and learning objectives.",
        bullets: [
          "Personalized question papers per student level",
          "Curriculum-aligned question generation",
          "Multiple difficulty tiers",
          "Answer key auto-generation",
        ],
      },
      {
        id: "auto-grading",
        icon: "✅",
        title: "Automated Exam Copy Checking",
        description:
          "OCR-powered answer sheet scanning and AI grading. Instant results with detailed performance analysis for every student.",
        bullets: [
          "OCR scanning with handwriting recognition",
          "AI grading with rubric-based scoring",
          "Instant result generation",
          "Detailed student performance analytics",
        ],
      },
      {
        id: "auto-forms",
        icon: "📝",
        title: "Auto-Form Filling",
        description:
          "Pre-fill government forms, registration documents, and certificates directly from your student database. Eliminate manual data entry.",
        bullets: [
          "Pre-fill government compliance forms",
          "Auto-generate student certificates",
          "Bulk document generation",
          "Template-based form automation",
        ],
      },
      {
        id: "analytics",
        icon: "📈",
        title: "Predictive Data Analytics",
        description:
          "AI-driven insights for dropout risk prediction, performance forecasting, and resource optimization. Proactive, not reactive.",
        bullets: [
          "Dropout risk early warning system",
          "Student performance prediction models",
          "Resource allocation optimization",
          "Custom dashboards with exportable reports",
        ],
      },
    ],
  },
  {
    id: "communication",
    title: "Communication & Monitoring",
    subtitle:
      "Stay connected with students, parents, and staff through intelligent communication channels.",
    features: [
      {
        id: "whatsapp-bot",
        icon: "💬",
        title: "WhatsApp AI Chatbot",
        description:
          "Natural language chatbot that answers queries from your database. Ask 'Show me Class 10 fees status' in plain English.",
        bullets: [
          "Natural language database queries",
          "Real-time responses to parents & staff",
          "Auto-notification for events & deadlines",
          "No app required — works in WhatsApp",
        ],
      },
      {
        id: "bus-tracking",
        icon: "🚌",
        title: "Live Bus Tracking",
        description:
          "Real-time GPS tracking with ETA predictions. Parents know exactly when the bus arrives. Administrators monitor entire fleet.",
        bullets: [
          "Real-time GPS vehicle tracking",
          "Accurate ETA predictions",
          "Automatic parent notifications",
          "Route optimization & analytics",
        ],
      },
      {
        id: "teacher-progress",
        icon: "📋",
        title: "Daily Teacher Progress Updates",
        description:
          "Auto-generated daily reports on topics covered, student engagement metrics, and homework compliance. No manual report writing.",
        bullets: [
          "Auto-generated daily teaching reports",
          "Student engagement tracking",
          "Homework compliance monitoring",
          "Weekly & monthly progress summaries",
        ],
      },
    ],
  },
  {
    id: "task-management",
    title: "Smart Task Management",
    subtitle:
      "AI distributes work intelligently based on roles, availability, and skill match.",
    features: [
      {
        id: "auto-task",
        icon: "⚡",
        title: "Automatic Task Distribution",
        description:
          "Tasks are automatically assigned to the right person at the right time. Role-based, skill-matched, and deadline-aware.",
        bullets: [
          "Role & skill-based auto-assignment",
          "Deadline-aware task scheduling",
          "Real-time progress tracking",
          "Completion analytics & performance scoring",
        ],
      },
    ],
  },
  {
    id: "ecosystem",
    title: "Dedicated Apps Ecosystem",
    subtitle:
      "Purpose-built apps for employees, students, and administrators — each designed for their specific workflows.",
    features: [
      {
        id: "employee-app",
        icon: "👨‍🏫",
        title: "Employee App",
        description:
          "Teachers and staff get a dedicated app for attendance marking, task execution, leave management, payroll viewing, and announcements.",
        bullets: [
          "Mobile attendance with geolocation",
          "Task inbox with priority sorting",
          "Leave apply & approval workflow",
          "Payslip viewing & salary analytics",
        ],
      },
      {
        id: "student-app",
        icon: "🎓",
        title: "Student App",
        description:
          "Students track their academic progress, view fee status, access study materials, check exam results, and receive real-time notifications.",
        bullets: [
          "Academic progress dashboard",
          "Fee payment & receipt download",
          "Exam results with performance charts",
          "Real-time notifications & announcements",
        ],
      },
    ],
  },
];