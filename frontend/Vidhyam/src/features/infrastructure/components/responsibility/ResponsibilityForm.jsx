import React from 'react';
import { Briefcase, Shield, Clock, DollarSign, Calendar, Activity, Users } from 'lucide-react';
import FormWidget from '../../../../components/ui/FormWidget';

const ResponsibilityForm = ({ 
  control, 
  onSubmit, 
  onCancel, 
  isLoading, 
  isEditing 
}) => {
  const sections = [
    {
      id: 'definition',
      title: 'MANDATE DEFINITION',
      icon: Briefcase,
      description: 'Define core protocol parameters and mission scope.',
      fields: [
        {
          name: 'name',
          label: 'Protocol Name',
          type: 'text',
          required: true,
          labelIcon: Shield,
          placeholder: 'e.g., Department Coordinator'
        },
        {
          name: 'employeeType',
          label: 'Target Personnel Class',
          type: 'select',
          required: true,
          labelIcon: Users,
          options: [
            { label: 'Teaching', value: 'teacher' },
            { label: 'Administrative Staff', value: 'staff' },
            { label: 'Management', value: 'administrator' },
            { label: 'Operational', value: 'operational' }
          ]
        },
        {
          name: 'description',
          label: 'Operational Brief',
          type: 'textarea',
          labelIcon: Activity,
          placeholder: 'Detailed scope of work and standard operating procedures...',
          rows: 3
        }
      ]
    },
    {
      id: 'parameters',
      title: 'DUTY PARAMETERS',
      icon: Shield,
      description: 'Configure priority, workload, and temporal span.',
      fields: [
        {
          name: 'priority',
          label: 'Mandate Priority',
          type: 'select',
          required: true,
          labelIcon: Zap,
          options: [
            { label: 'Critical / High', value: 'high' },
            { label: 'Standard / Medium', value: 'medium' },
            { label: 'Elective / Low', value: 'low' }
          ]
        },
        {
          name: 'estimatedHoursPerWeek',
          label: 'Weekly Load (Hours)',
          type: 'number',
          labelIcon: Clock,
          placeholder: 'e.g., 5'
        },
        {
          name: 'compensation',
          label: 'Credit Compensation',
          type: 'number',
          labelIcon: DollarSign,
          placeholder: '0.00'
        },
        {
          name: 'startDate',
          label: 'Activation Date',
          type: 'date',
          labelIcon: Calendar
        },
        {
          name: 'endDate',
          label: 'Decommission Date',
          type: 'date',
          labelIcon: Calendar
        },
        {
          name: 'isActive',
          label: 'Protocol Status',
          type: 'checkbox',
          labelIcon: Activity
        }
      ]
    }
  ];

  return (
    <FormWidget
      title={isEditing ? 'RE-CALIBRATE PROTOCOL' : 'AUTHORIZE NEW PROTOCOL'}
      description={isEditing ? 'Update the operational parameters of this existing mandate.' : 'Define a new institutional protocol for the mission registry.'}
      sections={sections}
      control={control}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
      submitLabel={isEditing ? 'UPDATE PROTOCOL' : 'AUTHORIZE PROTOCOL'}
      cancelLabel="DISCARD"
      showNavigation={true}
      className="max-w-3xl"
    />
  );
};

// Import Zap locally since it was missing from lucide-react import above
import { Zap } from 'lucide-react';

export default ResponsibilityForm;
