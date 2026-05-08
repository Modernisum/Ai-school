import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatsBar } from "./StatsBar";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-36">
      <div className="absolute inset-0 gradient-bg-subtle -z-10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-500/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <div className="animate-fade-in-up">
              <Badge variant="default" size="md">
                AI-Powered School Management
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05] text-text-primary animate-fade-in-up [animation-delay:100ms]">
              Automate{" "}
              <span className="gradient-text">80% of School</span>{" "}
              Tasks
            </h1>

            <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-lg animate-fade-in-up [animation-delay:200ms]">
              Zero human dependency required. Vidhyam&apos;s AI engine handles attendance,
              exams, finances, HR, and communication — so your staff can focus on education,
              not administration.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up [animation-delay:300ms]">
              <Link href="/get-started">
                <Button size="lg" className="w-full sm:w-auto">
                  Request Access
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Explore Features
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t border-border animate-fade-in-up [animation-delay:400ms]">
              <div className="flex items-center gap-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full ring-2 ring-white bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold"
                    >
                      {["S", "P", "C", "J"][i - 1]}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">500+</span> schools already automated
                </p>
              </div>
            </div>

            <StatsBar />
          </div>

          <div className="relative lg:justify-self-end animate-fade-in-up [animation-delay:200ms]">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary-500/20 to-accent-500/20 rounded-3xl blur-2xl animate-pulse-glow" />
              <div className="relative rounded-2xl border border-border/50 overflow-hidden shadow-elevated bg-white">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Vidhyam Dashboard</span>
                </div>
                <div className="p-5 space-y-4 bg-gradient-to-b from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg">
                      📊
                    </div>
                    <div>
                      <div className="text-xs text-text-secondary font-medium">TOTAL STUDENTS</div>
                      <div className="text-2xl font-bold text-text-primary">12,847</div>
                    </div>
                    <div className="ml-auto">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12.5%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Attendance", value: "98.7%", color: "bg-emerald-50 text-emerald-700" },
                      { label: "Fees Collected", value: "₹2.8Cr", color: "bg-primary-50 text-primary-700" },
                      { label: "Tasks Done", value: "94%", color: "bg-purple-50 text-purple-700" },
                    ].map((stat) => (
                      <div key={stat.label} className={`rounded-xl p-3 ${stat.color}`}>
                        <div className="text-[10px] font-semibold uppercase opacity-70">{stat.label}</div>
                        <div className="text-lg font-bold mt-0.5">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {[100, 75, 90, 60, 85].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-primary-500 to-primary-300 transition-all"
                          style={{ height: `${h}%`, minHeight: "20px" }}
                        />
                        <span className="text-[10px] text-text-tertiary text-center">{["M", "T", "W", "T", "F"][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}