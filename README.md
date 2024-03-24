# Google Calendar Event Synchronization AppScript

This Google Apps Script project is designed to handle new and updated events in a source private calendar by creating a copy of these events to block time in a default public calendar. It aims to maintain privacy while keeping others informed of the user's unavailability.

## Features

- **Automatic Event Copying**: New or updated events in the source private calendar are automatically copied to the public calendar.
- **Privacy-Focused**: Event details from the private calendar are not disclosed in the public calendar; only time is blocked off.
- **Recurring Events Support**: Partially supported
- **Concurrency Management**: Utilizes a global lock mechanism to ensure that events are processed in sequence, preventing duplication or omission.
- **Trigger-Based Execution**: Set up to trigger on calendar event updates, ensuring timely synchronization.

## Setup Instructions

### Prerequisites

- Access to Google Apps Script.
- IDs for both the source private calendar and the target public calendar.

### Steps

1. **Create a New Script**:
   - Navigate to [Google Apps Script](https://script.google.com) and start a new project.

2. **Script Configuration**:
   - Paste the provided script code into the script editor. Replace the placeholder calendar IDs with those of your source and target calendars.

3. **Enable Google Calendar API**:
   - Add the Google Calendar API service to your project through the Apps Script editor under **Services**.

4. **Trigger Setup**:
   - Configure a trigger for the `syncEvents` function to run on calendar event updates:
     - Go to **Edit** > **Current project's triggers**.
     - Click **+ Add Trigger**, select the `syncEvents` function, choose **Calendar** as the event source, and select **Calendar updated** as the event type.

5. **Deploy**:
   - Deploy the script according to your needs. It can run as a standalone script or as part of a web application.

## Usage

Once the setup is complete, the script automatically synchronizes new and updated events from the source private calendar to the public calendar whenever a calendar event is updated. This process runs in the background without requiring manual intervention.

## Limitations

- **Manual Deletion Required**: In some cases events deleted from the source calendar must be manually removed from the public calendar.
- **Detail Synchronization**: The script is designed to block off time without copying detailed event information to maintain privacy.

## Support

For troubleshooting and additional information, refer to the [Google Apps Script documentation](https://developers.google.com/apps-script). For specific issues or feature requests, consider reaching out through the Google Apps Script community forums or GitHub if the project is hosted there.

## License

This project is released under an open-source license. You are free to use, modify, and distribute it as per the license terms, typically found in the LICENSE file of the project repository.
