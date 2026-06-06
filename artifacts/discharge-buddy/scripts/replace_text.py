import os
import re

directory = "c:/Users/SRINJOYEE/Desktop/d-buddy4/Discharge-Buddy4/artifacts/discharge-buddy/app"
components_dir = "c:/Users/SRINJOYEE/Desktop/d-buddy4/Discharge-Buddy4/artifacts/discharge-buddy/components"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already using TranslateText
    if "TranslateText" in content:
        return

    # Check if Text is imported from react-native
    # This regex looks for imports from react-native that contain Text
    rn_import_match = re.search(r'import\s+{(.*?)}\s+from\s+[\'"]react-native[\'"];?', content, re.DOTALL)
    
    if rn_import_match:
        imports_str = rn_import_match.group(1)
        imports_list = [i.strip() for i in imports_str.split(',')]
        
        if 'Text' in imports_list:
            imports_list.remove('Text')
            
            # Reconstruct the import string
            if imports_list and any(i for i in imports_list if i):
                new_rn_import = f"import {{ {', '.join(imports_list)} }} from 'react-native';"
            else:
                new_rn_import = ""
                
            # Replace the old react-native import with the new one
            new_content = content.replace(rn_import_match.group(0), new_rn_import)
            
            # Add the new TranslateText import right after the react-native import (or at top)
            import_statement = "\nimport { TranslateText as Text } from '@/components/TranslateText';"
            
            if new_rn_import:
                new_content = new_content.replace(new_rn_import, new_rn_import + import_statement)
            else:
                # If react-native import was entirely removed
                new_content = import_statement + "\n" + new_content

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

for root, _, files in os.walk(components_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            # don't process the TranslateText itself
            if "TranslateText" not in file:
                process_file(os.path.join(root, file))

print("Done replacing Text imports.")
