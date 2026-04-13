import re
import sys

def count_endpoints_in_router(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Count route() calls
    route_pattern = r'\.route\('
    route_matches = re.findall(route_pattern, content)
    
    # Count nest() calls that might contain multiple routes
    nest_pattern = r'\.nest\('
    nest_matches = re.findall(nest_pattern, content)
    
    # Count specific HTTP method patterns
    get_pattern = r'\.get\('
    post_pattern = r'\.post\('
    put_pattern = r'\.put\('
    delete_pattern = r'\.delete\('
    patch_pattern = r'\.patch\('
    
    get_count = len(re.findall(get_pattern, content))
    post_count = len(re.findall(post_pattern, content))
    put_count = len(re.findall(put_pattern, content))
    delete_count = len(re.findall(delete_pattern, content))
    patch_count = len(re.findall(patch_pattern, content))
    
    total_methods = get_count + post_count + put_count + delete_count + patch_count
    
    print(f"Route calls: {len(route_matches)}")
    print(f"Nest calls: {len(nest_matches)}")
    print(f"GET methods: {get_count}")
    print(f"POST methods: {post_count}")
    print(f"PUT methods: {put_count}")
    print(f"DELETE methods: {delete_count}")
    print(f"PATCH methods: {patch_count}")
    print(f"Total HTTP methods: {total_methods}")
    
    # Also count routes that have multiple methods on same line
    multi_method_pattern = r'\.route\([^)]+\)\s*\.(get|post|put|delete|patch)\([^)]+\)'
    multi_method_count = len(re.findall(multi_method_pattern, content, re.DOTALL))
    print(f"Multi-method routes (approx): {multi_method_count}")
    
    # Estimate total endpoints
    estimated_endpoints = total_methods - multi_method_count  # Adjust for double counting
    print(f"\nEstimated total endpoints: {estimated_endpoints}")
    
    return estimated_endpoints

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = "Backend/src/routes/router.rs"
    
    count_endpoints_in_router(file_path)