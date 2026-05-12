import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { RequestAccessForm } from "@/components/forms/RequestAccessForm";

export default function GetStartedPage() {
  return (
    <>
      <SectionWrapper background="subtle">
        <SectionHeading
          badge="GET STARTED"
          title="Request Access to Vidhyam"
          description="Fill out the form below and our team will set up your school's Vidhyam account within 24 hours."
        />
        <div className="max-w-xl mx-auto">
          <Card variant="gradient-border" padding="lg">
            <RequestAccessForm />
          </Card>
        </div>
      </SectionWrapper>
    </>
  );
}