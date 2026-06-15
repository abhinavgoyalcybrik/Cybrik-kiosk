import json

lines_dict = {}

with open("/Users/abhinavgoyal9729/.gemini/antigravity/brain/cf0d84d2-fff8-4f90-8e63-1d9a25d00e2d/.system_generated/logs/transcript_full.jsonl", "r") as f:
    for line in f:
        data = json.loads(line)
        content = data.get("content", "")
        if "File Path: `file:///Users/abhinavgoyal9729/cybrik-edugraph/frontend/components/kiosk/KioskExperience.tsx`" in content:
            # Parse lines from view_file output
            parts = content.split("The following code has been modified to include a line number before every line")
            if len(parts) > 1:
                code_part = parts[1].split("\nThe above content does NOT show the entire file")[0]
                for code_line in code_part.split("\n"):
                    code_line = code_line.strip()
                    if ":" in code_line:
                        try:
                            line_num_str = code_line.split(":")[0]
                            line_num = int(line_num_str)
                            # Get everything after the first colon and space
                            line_content = code_line[len(line_num_str)+2:]
                            lines_dict[line_num] = line_content
                        except ValueError:
                            pass

# Write out the reconstructed file
with open("reconstructed_KioskExperience.tsx", "w") as out:
    for i in range(1, 2468):
        if i in lines_dict:
            out.write(lines_dict[i] + "\n")
        else:
            out.write(f"// MISSING LINE {i}\n")

print(f"Reconstructed {len(lines_dict)} out of 2467 lines.")
