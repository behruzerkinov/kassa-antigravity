!macro customInstall
  DetailPrint "Creating Desktop Shortcut..."
  CreateShortcut "$DESKTOP\Kassa POS.lnk" "$INSTDIR\kassa-pos.exe" "" "$INSTDIR\kassa-pos.exe" 0
!macroend

!macro customUnInstall
  DetailPrint "Cleaning up Desktop Shortcut and Autostart registry entry..."
  Delete "$DESKTOP\Kassa POS.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "KassaPOS"
!macroend
