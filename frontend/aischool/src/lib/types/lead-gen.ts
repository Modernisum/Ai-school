export interface SchoolAccessRequest {
  school_name: string;
  contact_name: string;
  email: string;
  phone: string;
  employee_count: number | null;
  student_count: number | null;
  message: string;
}

export interface SchoolAccessRequestResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
  };
  message?: string;
}