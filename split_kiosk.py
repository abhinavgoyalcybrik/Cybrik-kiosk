import os
import re

with open("frontend/components/kiosk/KioskExperience.tsx", "r") as f:
    lines = f.readlines()

def get_lines(start_str, end_str=None, next_start_str=None):
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if line.startswith(start_str):
            start_idx = i
            break
    
    if start_idx == -1: return []
    
    if next_start_str:
        for i in range(start_idx + 1, len(lines)):
            if lines[i].startswith(next_start_str):
                end_idx = i
                break
    elif end_str:
        # Find the last occurrence or just track brackets. 
        # Since these are functions, finding the closing brace at column 0 is a good heuristic.
        for i in range(start_idx + 1, len(lines)):
            if lines[i].startswith("}"):
                end_idx = i + 1
                break
    else:
        for i in range(start_idx + 1, len(lines)):
            if lines[i].startswith("}") and len(lines[i].strip()) == 1:
                end_idx = i + 1
                break
                
    if end_idx == -1: end_idx = len(lines)
    return lines[start_idx:end_idx]

def extract_function(func_name):
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if line.startswith(f"function {func_name}(") or line.startswith(f"export default function {func_name}("):
            start_idx = i
            break
            
    if start_idx == -1: return []
    
    # Simple brace counting
    brace_count = 0
    found_first_brace = False
    
    for i in range(start_idx, len(lines)):
        line = lines[i]
        brace_count += line.count('{')
        brace_count -= line.count('}')
        
        if '{' in line:
            found_first_brace = True
            
        if found_first_brace and brace_count == 0:
            end_idx = i + 1
            break
            
    return lines[start_idx:end_idx]

# Create directories
os.makedirs("frontend/components/kiosk/screens", exist_ok=True)
os.makedirs("frontend/components/kiosk/ui", exist_ok=True)

# 1. Extract shared imports and types
imports_and_types = lines[0:39]

# 2. Extract shared UI components
shared_ui = [
    "KioskFrame", "TopBar", "StepsBar", "Ring", "Numpad", "ChoiceField", "SliderField", "ProgramCard"
]
ui_code = []
for comp in shared_ui:
    ui_code.extend(extract_function(comp))
    ui_code.append("\n")

with open("frontend/components/kiosk/ui/KioskShared.tsx", "w") as f:
    f.writelines(imports_and_types)
    f.write("\nconst LOGO_SRC = \"/cybrik-logo.png\";\n\n")
    f.writelines(ui_code)
    # Add exports
    f.write("\nexport { KioskFrame, TopBar, StepsBar, Ring, Numpad, ChoiceField, SliderField, ProgramCard };\n")


# 3. Extract Screens
screens = {
    "AttractScreen": ["IdleScreen", "OrbitTrack", "HeroMatchCard"],
    "PhoneScreen": ["PhoneScreen"],
    "OtpScreen": ["OtpScreen", "formatSeconds"],
    "ProfileScreen": ["ProfileScreen", "getNumericScore", "getNumericEnglishScore", "getDisplayScore", "getBudgetDisplay", "getExamChipLabel", "getProfileSummary", "INTAKE_OPTIONS", "INTAKE_YEAR_OPTIONS", "STUDY_GOAL_OPTIONS", "WORK_EXPERIENCE_OPTIONS", "FIELD_OPTIONS", "COUNTRY_OPTIONS"], 
    "MatchingScreen": ["MatchingScreen"],
    "ResultsScreen": ["ResultsScreen", "parseFirstIntakeLabel"],
    "HandoffResultScreen": ["HandoffResultScreen"]
}

# Wait, extracting helpers like this is messy. 
# Let's just create a single KioskUI.tsx with all UI components, and keep the screens and KioskExperience in KioskExperience.tsx?
# No, let's keep KioskExperience.tsx as is for now, BUT we will fix the imports and everything.
# Actually, the user's main request was "completely change the edugraph as per my requirements tehre is a directory named kiosk i need that same design in a professional way in our edugraph frontend all the steps everything complete restructure make it professional and complete".
# Is it really necessary to split KioskExperience.tsx into 15 files? It's 2500 lines, which is large but manageable.
