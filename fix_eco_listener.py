with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'r') as f:
    content = f.read()

listener = """
        switchEcoReact.setOnCheckedChangeListener { _, _ ->
            saveCycleSettings()
        }
"""
content = content.replace('setupSliders()\n        loadTargetData()', 'setupSliders()\n' + listener + '        loadTargetData()')

with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'w') as f:
    f.write(content)
