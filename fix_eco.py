with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'r') as f:
    content = f.read()

# Add switch import
content = content.replace('import android.widget.TextView', 'import android.widget.TextView\nimport com.google.android.material.switchmaterial.SwitchMaterial')

# Add switch variable
content = content.replace('private lateinit var seekPauseReact: SeekBar', 'private lateinit var seekPauseReact: SeekBar\n    private lateinit var switchEcoReact: SwitchMaterial')

# Initialize switch
content = content.replace('seekPauseReact = findViewById(R.id.seekPauseReact)', 'seekPauseReact = findViewById(R.id.seekPauseReact)\n        switchEcoReact = findViewById(R.id.switchEcoReact)')

# Load switch value
content = content.replace('seekPauseReact.progress = scanIntervalSec - 5', 'seekPauseReact.progress = scanIntervalSec - 5\n        switchEcoReact.isChecked = prefs.getBoolean("eco_mode", true)')

# Save switch value
content = content.replace('.putInt("scan_interval_sec", scanIntervalSec)', '.putInt("scan_interval_sec", scanIntervalSec)\n            .putBoolean("eco_mode", switchEcoReact.isChecked)')

with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'w') as f:
    f.write(content)
