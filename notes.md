Tasks only appear in one place right now: the home screen, and only for today.

Home screen (index.tsx)
  └── getTodayTasks(userId) 
        → queries tasks WHERE check_in_date = TODAY
        → displayed in the task list component

There's no historical tasks view anywhere in the app. The tasks table has every task ever saved (with created_at, completed, check_in_id), but no screen queries or displays past days' tasks.

So the gap is:

DB: full task history stored ✓
Home screen: today only ✓
Progress screen: shows session counts/durations but not tasks at all
Dedicated task history view: doesn't exist
If you want users to see what tasks they've worked on over time (e.g. "last week I worked on X, Y, Z"), that would need a new screen or section in Progress. Worth flagging as a future feature — the data is already there, just not surfaced.

Do we have option to make a long promise which breaks down into daily tasks and helps build good habits over time
in task sceen add resume button which resumes from the same time it's left and then we mark it as closed

We don't have a feature where it actually tells users after sometime that if you didn't start then this but you did start and here's the progress you did
