import psycopg2
import collections
import json

DB_URI = "postgres://postgres:1234@localhost:5433/ai_school"

def get_db_schema():
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()

    # Get tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
    tables = [row[0] for row in cur.fetchall()]

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
    
    return tables, fks

def categorize_table(table_name):
    if "ai_" in table_name or "vector" in table_name or "ocr" in table_name:
        return "AI_ML"
    if "fee" in table_name or "payment" in table_name or "transaction" in table_name or "coupon" in table_name or "billing" in table_name or "invoice" in table_name:
        return "Finance"
    if "student" in table_name or "exam" in table_name or "grade" in table_name or "academic" in table_name or "class" in table_name or "subject" in table_name or "attendance" in table_name:
        return "Academics"
    if "employee" in table_name or "leave" in table_name or "payroll" in table_name or "salary" in table_name or "responsibility" in table_name or "task" in table_name:
        return "HR"
    if "space" in table_name or "material" in table_name or "inventory" in table_name or "equipment" in table_name or "complaint" in table_name or "timetable" in table_name:
        return "Infrastructure"
    if "user" in table_name or "auth" in table_name or "role" in table_name or "school" in table_name or "api_key" in table_name or "token" in table_name or "audit" in table_name or "log" in table_name:
        return "Core"
    return "Misc"

def generate_html():
    tables, fks = get_db_schema()
    
    nodes = []
    for t in tables:
        domain = categorize_table(t)
        nodes.append({
            "id": t,
            "label": f"{t}",
            "group": domain,
            "shape": "database",
            "title": f"Table: {t}\\nDomain: {domain}"
        })
        
    edges = []
    for fk in fks:
        source_table, source_col, target_table, target_col = fk
        edges.append({
            "from": source_table,
            "to": target_table,
            "arrows": "to",
            "title": f"{source_col} -> {target_col}"
        })
        
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <title>Modernisum Interactive ER Diagram</title>
  <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style type="text/css">
    #mynetwork {{
      width: 100vw;
      height: 100vh;
      border: 1px solid lightgray;
      background-color: #f8f9fa;
    }}
    body {{
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }}
    #legend {{
      position: absolute;
      top: 10px;
      left: 10px;
      background: white;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
      z-index: 1000;
    }}
  </style>
</head>
<body>
<div id="legend">
  <h3>Database Domains</h3>
  <ul id="legend-list" style="list-style: none; padding: 0;"></ul>
  <p><i>Drag canvas to move.<br>Scroll to zoom.<br>Drag nodes to arrange.<br>Hover for details.</i></p>
</div>
<div id="mynetwork"></div>

<script type="text/javascript">
  var nodes = new vis.DataSet({json.dumps(nodes)});
  var edges = new vis.DataSet({json.dumps(edges)});

  var container = document.getElementById('mynetwork');
  var data = {{
    nodes: nodes,
    edges: edges
  }};
  
  var options = {{
    nodes: {{
      font: {{ size: 14, face: 'Tahoma' }}
    }},
    edges: {{
      smooth: {{ type: 'continuous' }},
      color: {{ inherit: 'from', opacity: 0.6 }}
    }},
    physics: {{
      barnesHut: {{
        gravitationalConstant: -20000,
        centralGravity: 0.3,
        springLength: 200,
        springConstant: 0.04,
        damping: 0.09
      }},
      stabilization: {{ iterations: 2500 }}
    }},
    groups: {{
      "Core": {{ color: {{ background: '#ffcccc', border: '#ff0000' }} }},
      "Finance": {{ color: {{ background: '#ccffcc', border: '#00cc00' }} }},
      "HR": {{ color: {{ background: '#ccccff', border: '#0000ff' }} }},
      "Academics": {{ color: {{ background: '#ffffcc', border: '#cccc00' }} }},
      "AI_ML": {{ color: {{ background: '#ffccff', border: '#cc00cc' }} }},
      "Infrastructure": {{ color: {{ background: '#ccffff', border: '#00cccc' }} }},
      "Misc": {{ color: {{ background: '#eeeeee', border: '#999999' }} }}
    }}
  }};

  var network = new vis.Network(container, data, options);
  
  // Build Legend
  var legendList = document.getElementById('legend-list');
  var groups = options.groups;
  for (var groupName in groups) {{
      var li = document.createElement('li');
      li.innerHTML = '<span style="display:inline-block; width:15px; height:15px; border-radius:50%; background:' + groups[groupName].color.background + '; border: 1px solid ' + groups[groupName].color.border + '; margin-right: 8px; vertical-align: middle;"></span>' + groupName;
      legendList.appendChild(li);
  }}
</script>
</body>
</html>"""

    with open("backend/guides/interactive_er_diagram.html", "w", encoding="utf-8") as f:
        f.write(html_content)

if __name__ == "__main__":
    generate_html()
