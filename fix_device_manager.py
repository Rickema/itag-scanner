import re

with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'r') as f:
    content = f.read()

# Replace removeTargetBtnLarge references
content = content.replace('private lateinit var removeTargetBtnLarge: Button', '''private lateinit var targetActionsRow: LinearLayout
    private lateinit var btnToastDetails: TextView
    private lateinit var btnRemoveTarget: TextView
    private lateinit var btnCopyMac: TextView
    private lateinit var btnRenameTarget: TextView''')

content = content.replace('removeTargetBtnLarge = findViewById(R.id.removeTargetBtnLarge)', '''targetActionsRow = findViewById(R.id.targetActionsRow)
        btnToastDetails = findViewById(R.id.btnToastDetails)
        btnRemoveTarget = findViewById(R.id.btnRemoveTarget)
        btnCopyMac = findViewById(R.id.btnCopyMac)
        btnRenameTarget = findViewById(R.id.btnRenameTarget)''')

content = content.replace('removeTargetBtnLarge.setOnClickListener', 'btnRemoveTarget.setOnClickListener')

content = content.replace('removeTargetBtnLarge.visibility = View.VISIBLE', 'targetActionsRow.visibility = View.VISIBLE')
content = content.replace('removeTargetBtnLarge.visibility = View.GONE', 'targetActionsRow.visibility = View.GONE')

# Update tvTargetTechBadge background dynamically
content = content.replace('tvTargetTechBadge.text = "● Target Sconosciuto"', 'tvTargetTechBadge.text = "● Target Sconosciuto"\n            tvTargetTechBadge.setBackgroundResource(0)')
content = content.replace('tvTargetTechBadge.text = "● Target $tech"', 'tvTargetTechBadge.text = "● Target $tech"\n            tvTargetTechBadge.setBackgroundResource(R.drawable.bg_badge_outline_blue)')

# Add copy MAC functionality
copy_logic = '''
        btnCopyMac.setOnClickListener {
            val mac = prefs.getString("target_mac", null)
            if (mac != null) {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                val clip = android.content.ClipData.newPlainText("MAC Address", mac)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "MAC copiato", Toast.LENGTH_SHORT).show()
            }
        }
        
        btnToastDetails.setOnClickListener {
            Toast.makeText(this, "Dettagli Toast (Simulazione)", Toast.LENGTH_SHORT).show()
        }
        
        btnRenameTarget.setOnClickListener {
             Toast.makeText(this, "Rinomina non ancora implementato", Toast.LENGTH_SHORT).show()
        }
'''
content = content.replace('setupSliders()', copy_logic + '\n        setupSliders()')

with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'w') as f:
    f.write(content)
