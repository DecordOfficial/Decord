# Vencord Performance Mode Toggle Plugin

A Vencord user plugin that adds a performance mode toggle button to optimize Discord settings for better performance.

## Features

- **Performance Mode Toggle**: Quick access button in the chat input area
- **Automatic Settings Optimization**: Disables resource-intensive features when enabled
- **Settings Restoration**: Saves and restores original settings when disabled
- **Customizable Options**: Configure which optimizations to apply
- **Visual Feedback**: Shows current status and active optimizations

## Settings

- **Enable**: Toggle performance mode on/off
- **Disable Embeds**: Disable auto-embed links (reduces network requests)
- **Compact Mode**: Enable compact message mode (less visual clutter)
- **Disable Animated Emojis**: Disable animated emojis (reduces CPU usage)
- **Disable Auto-play GIFs**: Disable auto-play GIFs (saves bandwidth)
- **Disable Activity Status**: Disable activity status sharing (reduces overhead)
- **Custom CSS**: Apply custom performance CSS optimizations

## How It Works

When Performance Mode is enabled, the plugin:

1. Saves your current Discord settings
2. Applies performance optimizations:
   - Disables auto-embed links
   - Enables compact message mode
   - Disables animated emojis
   - Disables auto-play GIFs
   - Disables activity status sharing
   - Applies custom CSS optimizations
3. Shows a toggle button in the chat input area
4. Restores original settings when disabled

## Installation

1. Copy the `blu-performancemodetoggle` folder to your Vencord `src/userplugins` directory
2. Rebuild Vencord: `npm run build`
3. Restart Discord
4. Enable the plugin in Vencord settings

## Usage

1. Enable the plugin in Vencord settings
2. Configure which optimizations you want to apply
3. Click the performance mode toggle button (⚡) in the chat input area
4. The button will show "⚡ ON" when performance mode is active
5. Click again to disable and restore original settings

## Dependencies

- UserSettingsAPI
- ChatInputButtonAPI

## AI Disclaimer

This plugin was developed with the assistance of AI (Claude Sonnet 4). The AI helped with code structure, implementation details, and debugging. While the code has been reviewed and tested, please use it at your own discretion. If you encounter any issues, please report them through the GitHub issues page.
