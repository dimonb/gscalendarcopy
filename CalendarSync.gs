/**
 * Synchronizes events from a specified Google Calendar, ensuring no concurrent
 * execution by acquiring a script lock. It delegates to syncEventsLocked for
 * the synchronization logic after successfully obtaining the lock.
 *
 * @param {string} calendarId The ID of the calendar to synchronize events from.
 * @param {boolean} fullSync Determines whether to perform a full synchronization,
 * ignoring any existing sync tokens and fetching all events within a specified range.
 */
function syncEvents(calendarId, fullSync) {
  // Get a public lock on this script, preventing other instances from running concurrently
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 30 seconds for other instances to finish; adjust as needed
    var lockAcquired = lock.tryLock(60000);
    if (!lockAcquired) {
      Logger.log('Could not obtain lock after 60 seconds.');
      return;
    }
    
    syncEventsLocked(calendarId, fullSync);
    
  } finally {
    // Always release the lock in a finally block to ensure it's released even if an error occurs
    lock.releaseLock();
  }
}

/**
 * Performs the actual synchronization of events, either using a stored sync token
 * for incremental sync or fetching all events within the past 30 days for a full sync.
 * Handles pagination of the Google Calendar API and manages sync tokens for future
 * incremental syncs. Also processes each event, including removal of canceled events
 * and recreation in a specified manner for others.
 *
 * @param {string} calendarId The ID of the calendar from which to synchronize events.
 * @param {boolean} fullSync Flag indicating whether a full sync should be performed,
 * discarding any stored sync token.
 */
function syncEventsLocked(calendarId, fullSync) {
  if (!calendarId){
    calendarId = PropertiesService.getScriptProperties().getProperty('sourceCalendarID'); //for debug running, should be defined in project settings
  }

  
  var properties = PropertiesService.getUserProperties();
  var options = {
    maxResults: 100
  };
  var syncTokenKey = 'syncToken.' + calendarId; 
  var syncToken = properties.getProperty(syncTokenKey);
  if (syncToken && !fullSync) {
    options.syncToken = syncToken;
  } else {
    // Sync events up to thirty days in the past.
    options.timeMin = getRelativeDate(-30, 0).toISOString();
  }

  console.log('syncTokenKey: %s', syncTokenKey)
  console.log('syncToken: %s', syncToken);

  // Retrieve events one page at a time.
  var events;
  var pageToken;
  do {
    try {
      options.pageToken = pageToken;
      events = Calendar.Events.list(calendarId, options);
    } catch (e) {
      // Check to see if the sync token was invalidated by the server;
      // if so, perform a full sync instead.
      if (e.message.includes('a full sync is required')) {
        properties.deleteProperty(syncTokenKey);
        console.log('remove syncToken');
        syncEventsLocked(calendarId, true);
        return;
      } else {
        throw new Error(e.message);
      }
    }

    if (events.items && events.items.length > 0) {
      for (var i = 0; i < events.items.length; i++) {
        var event = events.items[i];
        
        if (event.status === 'cancelled') {
          console.log('Event id %s was cancelled.', event.id);
          removeCopyEvent(event.id);
        } else if (event.start.date) {
          // All-day event.
          var start = new Date(event.start.date);
          console.log('%s (%s), id=%s', event.summary, start.toLocaleDateString(), event.id);
        } else {
          // Events that don't last all day; they have defined start times.
          var calendar = CalendarApp.getDefaultCalendar();

          if (event.recurrence){
            console.log('recuring event');
            var newEvent = {
              summary: "busy",
              description: event.id,
              start: event.start,
              end: event.end,
              recurrence: event.recurrence,
              // Add other fields as necessary
            };
            removeCopyEvent(event.id);
            Calendar.Events.insert(newEvent, calendar.getId());
          } else {
            removeCopyEvent(event.id);
            var start = new Date(event.start.dateTime);
            console.log('%s (%s), id=%s', event.summary, start.toLocaleString(), event.id);
            calendar.createEvent(
              "busy", new Date(event.start.dateTime), new Date(event.end.dateTime), {description: event.id});
          }
        }
      }
    } else {
      console.log('No events found.');
    }

    pageToken = events.nextPageToken;
  } while (pageToken);

  properties.setProperty(syncTokenKey, events.nextSyncToken);
  console.log('save syncToken');
}

/**
 * Searches for and deletes events matching a specified identifier within a 60-day window
 * surrounding the current date. This includes both single events and entire series of
 * recurring events, ensuring complete removal based on the event ID.
 *
 * @param {string} eventID The unique identifier or part of the event details used to
 * search for and identify events to be removed.
 */
function removeCopyEvent(eventID) { //chatgpt generated
  var deletedEventSeriesIds = {};
  var needToRestart;
  
  do {
    needToRestart = false; // Reset the flag at the beginning of each iteration
    var events = CalendarApp.getDefaultCalendar().getEvents(getRelativeDate(-30, 0), getRelativeDate(30, 0), {search: eventID});
    Logger.log('Number of events with id=%s: %s', eventID, events.length);

    for (var i = 0; i < events.length; i++) {
      var event = events[i];

      if (event.isRecurringEvent()) {
        var series = event.getEventSeries();
        var seriesId = series.getId();

        if (!deletedEventSeriesIds[seriesId]) {
          series.deleteEventSeries(); // Delete the recurring event series
          deletedEventSeriesIds[seriesId] = true; // Mark this series as deleted
          needToRestart = true; // Set the flag to restart search due to modification of the event list
          break; // Exit the for-loop to restart the search
        }
      } else {
        event.deleteEvent(); // Delete non-recurring events immediately
      }
    }
  } while (needToRestart); // Continue the loop if the event list was modified
}

/**
 * Calculates a new Date object relative to the current date, adjusted by a specified
 * number of days and set to a specific hour of the day. Useful for creating consistent
 * date and time settings for event queries or settings.
 *
 * @param {number} daysOffset The number of days to adjust from the current date.
 * @param {number} hour The hour of the day (in 24-hour format) to set for the new date.
 * @return {Date} The newly calculated date.
 */
function getRelativeDate(daysOffset, hour) {
  var date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}
