import os
import shutil

basedir = r"c:\Users\lurain\develop\Watchtower\src\routes"

targets = [
    "about",
    "apis/dashboard",
    "apis/logs",
    "apis/schema",
    "apis/settings",
    "domains/dashboard",
    "monitor/logs",
    "monitor/settings",
    "proxy/dashboard",
    "proxy/setup"
]

for t in targets:
    t_path = t.replace("/", "\\")
    dirname = os.path.dirname(t_path)
    basename = os.path.basename(t_path)
    
    target_dir = os.path.join(basedir, t_path)
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    ts_files = {
        f"{basename}.tsx": "index.tsx",
        f"{basename}.en.ts": "en.ts",
        f"{basename}.ko.ts": "ko.ts"
    }

    for src_filename, dest_filename in ts_files.items():
        src_path = os.path.join(basedir, dirname, src_filename) if dirname else os.path.join(basedir, src_filename)
        dest_path = os.path.join(target_dir, dest_filename)
        
        if os.path.exists(src_path):
            shutil.move(src_path, dest_path)
            
            # Content updates for index.tsx
            if dest_filename == "index.tsx":
                with open(dest_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Replace imports
                content = content.replace(f'from "./{basename}.en"', 'from "./en"')
                content = content.replace(f'from "./{basename}.ko"', 'from "./ko"')
                
                # Replace route path
                original_route = f'("/{t}")'
                new_route = f'("/{t}/")'
                content = content.replace(original_route, new_route)
                
                with open(dest_path, "w", encoding="utf-8") as f:
                    f.write(content)
            
            # Sub-content updates for ko.ts and en.ts
            if dest_filename == "ko.ts":
                with open(dest_path, "r", encoding="utf-8") as f:
                    content = f.read()
                content = content.replace(f'from "./{basename}.en"', 'from "./en"')
                with open(dest_path, "w", encoding="utf-8") as f:
                    f.write(content)


# Special case for monitor dashboard
monitor_index = os.path.join(basedir, "monitor", "index.tsx")
if os.path.exists(monitor_index):
    with open(monitor_index, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('from "./dashboard.en"', 'from "./en"')
    content = content.replace('from "./dashboard.ko"', 'from "./ko"')
    with open(monitor_index, "w", encoding="utf-8") as f:
        f.write(content)

en_path = os.path.join(basedir, "monitor", "dashboard.en.ts")
ko_path = os.path.join(basedir, "monitor", "dashboard.ko.ts")
if os.path.exists(en_path):
    shutil.move(en_path, os.path.join(basedir, "monitor", "en.ts"))
if os.path.exists(ko_path):
    shutil.move(ko_path, os.path.join(basedir, "monitor", "ko.ts"))
    
    # fix ko.ts import
    with open(os.path.join(basedir, "monitor", "ko.ts"), "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace('from "./dashboard.en"', 'from "./en"')
    with open(os.path.join(basedir, "monitor", "ko.ts"), "w", encoding="utf-8") as f:
        f.write(content)

print("Files moved and contents updated!")
