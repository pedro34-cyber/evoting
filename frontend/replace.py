import os, glob

files = glob.glob('/home/ezekdo/mikey/frontend/src/pages/*.tsx') + glob.glob('/home/ezekdo/mikey/frontend/src/components/*.tsx')

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Replace fetch calls
    content = content.replace("fetch('/api/", "fetch((import.meta.env.VITE_API_URL || '') + '/api/")
    
    with open(f, 'w') as file:
        file.write(content)
    print(f"Updated {f}")
