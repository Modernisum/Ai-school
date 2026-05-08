-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image_url VARCHAR(1000),
    author_name VARCHAR(255) DEFAULT 'Vidhyam Team',
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    seo_title VARCHAR(200),
    seo_description VARCHAR(500),
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    client_title VARCHAR(255),
    school_name VARCHAR(500),
    avatar_url VARCHAR(1000),
    rating SMALLINT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    content TEXT NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(is_featured, display_order);

-- School access requests (lead gen)
CREATE TABLE IF NOT EXISTS school_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(500) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    employee_count INT,
    student_count INT,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_requests_status ON school_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_school_requests_email ON school_access_requests(email);