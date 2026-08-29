with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'r') as f:
    content = f.read()

content = content.replace('targetActionsRow.visibility = View.VISIBLE', 'targetActionsRow.visibility = View.VISIBLE\n            btnRenameTarget.visibility = View.VISIBLE')
content = content.replace('targetActionsRow.visibility = View.GONE', 'targetActionsRow.visibility = View.GONE\n            btnRenameTarget.visibility = View.GONE')

with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'w') as f:
    f.write(content)
