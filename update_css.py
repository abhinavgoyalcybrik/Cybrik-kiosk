import re

with open("frontend/app/globals.css", "r") as f:
    css = f.read()

# Restore layout constraints
css = re.sub(
    r"\.kiosk-shell-page {\n  min-height: 100dvh;\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n}",
    ".kiosk-shell-page {\n  min-height: 100dvh;\n  padding: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  overflow: hidden;\n}",
    css
)

css = re.sub(
    r"\.kiosk-device {\n  position: relative;\n  z-index: 1;\n  width: 100%;\n  flex: 1;\n  background: var\(--bg\);\n}",
    ".kiosk-device {\n  position: relative;\n  z-index: 1;\n  width: 100vw;\n  height: 100dvh;\n  overflow: hidden;\n  background: var(--bg);\n}",
    css
)

css = re.sub(
    r"\.kiosk {\n  width: 100%;\n  min-height: 100dvh;\n  background: var\(--bg\);\n  color: var\(--ink\);\n  position: relative;\n  display: flex;\n  flex-direction: column;\n}",
    ".kiosk {\n  width: 100%;\n  height: 100%;\n  min-height: 100dvh;\n  background: var(--bg);\n  color: var(--ink);\n  position: relative;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n}",
    css
)

# Typography scaling (roughly 1.3x to 1.5x)
css = re.sub(r"\.display\s*\{[^}]+\}", ".display {\n  font-size: 140px;\n  font-weight: 800;\n  line-height: 0.98;\n  letter-spacing: -2.5px;\n  color: var(--navy);\n}", css)
css = re.sub(r"\.h1\s*\{[^}]+\}", ".h1 {\n  font-size: 78px;\n  font-weight: 800;\n  line-height: 1.02;\n  letter-spacing: -1.4px;\n  color: var(--navy);\n}", css)
css = re.sub(r"\.h2\s*\{[^}]+\}", ".h2 {\n  font-size: 64px;\n  font-weight: 800;\n  line-height: 1.05;\n  letter-spacing: -0.8px;\n  color: var(--navy);\n}", css)
css = re.sub(r"\.h3\s*\{[^}]+\}", ".h3 {\n  font-size: 52px;\n  font-weight: 700;\n  line-height: 1.1;\n  letter-spacing: -0.4px;\n  color: var(--navy);\n}", css)
css = re.sub(r"\.title\s*\{[^}]+\}", ".title {\n  font-size: 38px;\n  font-weight: 700;\n  color: var(--navy);\n}", css)
css = re.sub(r"\.body\s*\{[^}]+\}", ".body {\n  font-size: 34px;\n  font-weight: 500;\n  color: var(--ink-2);\n  line-height: 1.4;\n}", css)
css = re.sub(r"\.small\s*\{[^}]+\}", ".small {\n  font-size: 28px;\n  font-weight: 500;\n  color: var(--ink-2);\n}", css)
css = re.sub(r"\.eyebrow\s*\{[^}]+\}", ".eyebrow {\n  font-size: 24px;\n  font-weight: 700;\n  letter-spacing: 1.5px;\n  text-transform: uppercase;\n  color: var(--ink-3);\n}", css)

# Make stage use grid for 16:9
css = re.sub(r"\.stage\s*\{[^}]+\}", ".stage {\n  flex: 1;\n  min-height: 0;\n  display: flex;\n  flex-direction: row;\n  padding: 40px 64px;\n}", css)

with open("frontend/app/globals.css", "w") as f:
    f.write(css)
