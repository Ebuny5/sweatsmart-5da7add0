# Verify there are no typescript/linting issues with our changes
import subprocess

try:
    result = subprocess.run(["npm", "run", "build"], capture_output=True, text=True, timeout=30)
    print("Build Success:", result.returncode == 0)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
except Exception as e:
    print(f"Exception running build: {e}")
