import psycopg2
import collections

# DB connection parameters based on docker-compose
DB_URI = "postgres://postgres:1234@localhost:5433/ai_school"

def get_db_schema():
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()

    # Get tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
    tables = [row[0] for row in cur.fetchall()]

    # Get columns
    cur.execute("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'")
    columns = collections.defaultdict(list)
    for t_name, c_name, d_type in cur.fetchall():
        columns[t_name].append((c_name, d_type))

    # Get foreign keys
    fk_query = """
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY';
    """
    cur.execute(fk_query)
    fks = []
    for row in cur.fetchall():
        fks.append(row)

    cur.close()
    conn.close()
    
    return tables, columns, fks

def categorize_table(table_name):
    if "ai_" in table_name or "vector" in table_name or "ocr" in table_name:
        return "AI & Machine Learning"
    if "fee" in table_name or "payment" in table_name or "transaction" in table_name or "coupon" in table_name or "billing" in table_name or "invoice" in table_name:
        return "Finance & Billing"
    if "student" in table_name or "exam" in table_name or "grade" in table_name or "academic" in table_name or "class" in table_name or "subject" in table_name or "attendance" in table_name:
        return "Academics & Students"
    if "employee" in table_name or "leave" in table_name or "payroll" in table_name or "salary" in table_name or "responsibility" in table_name or "task" in table_name:
        return "HR & Operations"
    if "space" in table_name or "material" in table_name or "inventory" in table_name or "equipment" in table_name or "complaint" in table_name or "timetable" in table_name:
        return "Infrastructure & Resources"
    if "user" in table_name or "auth" in table_name or "role" in table_name or "school" in table_name or "api_key" in table_name or "token" in table_name or "audit" in table_name or "log" in table_name:
        return "Core & Identity"
    return "Miscellaneous"

def generate_mermaid():
    tables, columns, fks = get_db_schema()
    
    domains = collections.defaultdict(list)
    for t in tables:
        domains[categorize_table(t)].append(t)
        
    markdown = "# 🗄️ Database ER Diagrams\n\nYahan par saare PostgreSQL tables ke Entity-Relationship (ER) diagrams diye gaye hain, jo alag-alag modules (domains) ke hisaab se categorized hain. Isse aapko tables ke beech ke relationships easily samajh aa jayenge.\n\n"
    
    for domain, domain_tables in domains.items():
        if not domain_tables:
            continue
            
        markdown += f"## {domain}\n\n"
        markdown += "```mermaid\nerDiagram\n"
        
        # Add tables and columns
        for t in domain_tables:
            markdown += f"    {t} {{\n"
            for c_name, d_type in columns[t]:
                clean_type = d_type.replace(" ", "_").replace("[]", "_array")
                markdown += f"        {clean_type} {c_name}\n"
            markdown += "    }\n"
            
        # Add relationships where both tables are in this domain (or from another domain to show connections)
        # To avoid massive cross-domain spiderwebs, we'll only show relationships if the source table is in this domain
        for fk in fks:
            source_table, source_col, target_table, target_col = fk
            if source_table in domain_tables:
                # Syntax: SOURCE }|..|| TARGET : "foreign key"
                markdown += f"    {source_table} }}|--|| {target_table} : \"{source_col} -> {target_col}\"\n"
                
        markdown += "```\n\n"
        
    with open("backend/guides/database_er_diagram.md", "w", encoding="utf-8") as f:
        f.write(markdown)

if __name__ == "__main__":
    generate_mermaid()
    print("ER Diagram generated successfully!")
