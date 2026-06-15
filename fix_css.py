with open("./frontend/.next/dev/static/chunks/app_kiosk_kiosk_css_0w3-wzy._.single.css", "r") as f:
    lines = f.readlines()

if lines[0].startswith("/* [project]"):
    lines = lines[1:]

with open("frontend/app/globals.css", "w") as f:
    f.write('@import "tailwindcss";\n\n')
    f.writelines(lines)
