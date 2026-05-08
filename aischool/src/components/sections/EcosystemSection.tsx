import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBox } from "@/components/ui/IconBox";

export function EcosystemSection() {
  const apps = [
    {
      title: "Employee App",
      icon: "👨‍🏫",
      variant: "primary" as const,
      description:
        "Teachers and staff get a dedicated app for attendance, task execution, leave management, payroll, and announcements.",
      features: [
        "Mobile attendance with geolocation",
        "Task inbox with priority sorting",
        "Leave apply & approval workflow",
        "Payslip viewing & salary analytics",
      ],
    },
    {
      title: "Student App",
      icon: "🎓",
      variant: "accent" as const,
      description:
        "Students track progress, view fees, access materials, check results, and receive real-time notifications.",
      features: [
        "Academic progress dashboard",
        "Fee payment & receipt download",
        "Exam results with performance charts",
        "Real-time notifications & announcements",
      ],
    },
  ];

  return (
    <SectionWrapper id="ecosystem" background="white">
      <SectionHeading
        badge="APPS"
        title="Dedicated Apps Ecosystem"
        description="Purpose-built apps for employees and students — each designed for their specific workflows."
      />

      <div className="grid md:grid-cols-2 gap-8">
        {apps.map((app) => (
          <Card key={app.title} variant="gradient-border" hover padding="lg" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-50 to-transparent rounded-bl-full -z-10" />
            <div className="flex items-center gap-4 mb-6">
              <IconBox variant={app.variant} size="lg" className="text-2xl">
                {app.icon}
              </IconBox>
              <div>
                <h3 className="text-xl font-bold text-text-primary">{app.title}</h3>
                <Badge variant="default" size="sm">
                  Coming to App Store
                </Badge>
              </div>
            </div>
            <p className="text-text-secondary leading-relaxed mb-5">{app.description}</p>
            <ul className="space-y-2.5">
              {app.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <svg className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}