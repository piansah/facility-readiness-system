import re
with open('master_schema_v4.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()
new_lines = []
for line in lines:
    match = re.match(r'^CREATE POLICY\s+(\w+)\s+ON\s+([^\s]+)\s+FOR.*', line, re.IGNORECASE)
    if match:
        policy_name = match.group(1)
        table_name = match.group(2)
        new_lines.append(f"DROP POLICY IF EXISTS {policy_name} ON {table_name};\n")
    new_lines.append(line)
with open('master_schema_v4.sql', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Done adding drop policies.')
