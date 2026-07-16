# Vencord Wait For Voice Channel Slot Plugin

A Vencord plugin that adds a "Wait for Slot" button to voice channel context menus. This plugin allows you to wait until a slot becomes available in a full voice channel instead of manually checking back.

## Features

- **Context Menu Integration**: Right-click on any voice channel to see the "Wait for Slot" option
- **Smart Detection**: Only shows the option when the channel is actually full (at user limit)
- **Automatic Monitoring**: Continuously checks for available slots
- **Sound Notifications**: Optional notification sound when a slot becomes available
- **Confirmation Modal**: Optional confirmation dialog when a slot becomes available
- **Progress Updates**: Shows waiting status toasts at configurable intervals
- **Multi-Channel Support**: Wait for slots in multiple channels across multiple servers
- **Auto-Stop**: Automatically stops waiting when you disconnect from voice
- **Immediate Join**: If a slot is already available, joins immediately
- **Commands**: `/stopwaiting` and `/waiting` commands for management

## Settings

- **Show Confirmation Modal**: Show confirmation dialog when a slot becomes available (default: enabled)
- **Play Sound**: Play notification sound when a slot becomes available (default: enabled)
- **Stop on Disconnect**: Stop waiting when you disconnect from voice (default: enabled)
- **Toast Interval**: Interval between waiting status toasts in seconds (0 = off, default: 30)

## How It Works

1. Right-click on a voice channel that is at its user limit
2. Select "Wait for Slot" from the context menu
3. The plugin immediately starts monitoring the channel
4. When a slot becomes available:
   - Plays a notification sound (if enabled)
   - Shows confirmation modal (if enabled) or joins immediately
5. You'll receive toast notifications about the waiting status and when you successfully join

## Requirements

- Voice channel must have a user limit set
- Channel must be at its user limit (full)
- You must have permission to connect to the voice channel







## Installation 

### 🪄 Installation Wizard
The easiest way to install this plugin is to use the **[Plugin Installer Generator](https://bluscream-vencord-plugins.github.io)**. 
Simply select this plugin from the list and download your custom install script.

### 💻 Manual Installation (PowerShell)
Alternatively, you can run this snippet in your Equicord/Vencord source directory:
```powershell
$ErrorActionPreference = "Stop"
winget install -e --id Git.Git
winget install -e --id OpenJS.NodeJS
npm install -g pnpm
git clone https://github.com/Equicord/Equicord Equicord
New-Item -ItemType Directory -Force -Path "Equicord\src\userplugins" | Out-Null
git clone https://github.com/bluscream-vencord-plugins/blu-vc-waitforslot.git -b "main" "Equicord\src\userplugins\blu-vc-waitforslot"
cd "Equicord"
npm install -g pnpm
pnpm install --frozen-lockfile
pnpm build
pnpm buildWeb
pnpm inject
```
