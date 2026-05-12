import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function TaskManagementSection() {
  return (
    <SectionWrapper id="task-management" background="subtle">
      <SectionHeading
        badge="WORKFLOWS"
        title="Smart Task Management"
        description="AI distributes work intelligently based on roles, availability, and skill match."
      />

      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 to-accent-500 hidden md:block" />

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Trigger Event",
                description:
                  "A new task is created — exam scheduling, leave request, fee reminder, or inventory reorder.",
              },
              {
                step: "02",
                title: "AI Analysis",
                description:
                  "The AI engine analyzes the task type, required skills, employee availability, and workload distribution.",
              },
              {
                step: "03",
                title: "Smart Assignment",
                description:
                  "The task is automatically assigned to the most suitable employee with deadline and priority set.",
              },
              {
                step: "04",
                title: "Real-time Tracking",
                description:
                  "Progress is tracked in real-time. Managers get dashboards. Delayed tasks trigger auto-escalation.",
              },
              {
                step: "05",
                title: "Completion & Analytics",
                description:
                  "Tasks are marked complete with performance scoring. Analytics help optimize future assignments.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="hidden md:flex w-16 h-16 rounded-2xl gradient-bg text-white items-center justify-center font-bold text-lg shrink-0 relative z-10">
                  {item.step}
                </div>
                <div className="md:hidden w-10 h-10 rounded-xl gradient-bg text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">{item.title}</h3>
                  <p className="text-text-secondary">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}