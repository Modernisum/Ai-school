export interface Testimonial {
  id: string;
  client_name: string;
  client_title: string;
  school_name: string;
  avatar_url: string | null;
  rating: number;
  content: string;
  is_featured: boolean;
  display_order: number;
  is_published: boolean;
  created_at: string;
}

export interface TestimonialsResponse {
  success: boolean;
  data: Testimonial[];
}