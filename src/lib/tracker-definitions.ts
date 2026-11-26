import { nutrients } from "./tracker-math";

export type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[]; relation?: string; min?: number };
const field = (key: string, label: string, type = "text", required = false): Field => ({ key, label, type, required });
const num = (key: string, label: string, min = 0): Field => ({ key, label, type: "number", min });
const choice = (key: string, label: string, ...options: string[]): Field => ({ key, label, options });
const link = (key: string, label: string, relation: string, required = false): Field => ({ key, label, relation, required });
const notes = field("notes", "Notes", "textarea");
const fuel = nutrients.map((key) => num(key, key === "calories" ? "Calories (kcal)" : key === "sodium" ? "Sodium (mg)" : key[0].toUpperCase() + key.slice(1) + " (g)"));

export const trackers: Record<string, { title: string; fields: Field[] }> = {
  exercises: { title: "Exercise library", fields: [field("muscle", "Primary muscle"), field("secondary", "Secondary muscles"), field("equipment", "Equipment"), field("type", "Exercise type"), field("instructions", "Instructions", "textarea"), field("reference", "Reference URL", "url"), notes] },
  plans: { title: "Workout plans", fields: [choice("split", "Split", "Custom", "Push/pull/legs", "Upper/lower", "Full body", "Chest and shoulders", "Back", "Arms", "Legs", "Rest day"), field("schedule", "Schedule notes"), num("repeat", "Repeat every N days from plan date", 1), field("template", "Template instructions", "textarea"), notes] },
  workouts: { title: "Workout history", fields: [link("plan", "Plan", "plans"), choice("status", "Status", "Completed", "Planned"), num("minutes", "Duration (minutes)"), num("calories", "Calories burned (manual)"), notes] },
  sets: { title: "Workout sets", fields: [link("workout", "Workout", "workouts", true), link("exercise", "Exercise", "exercises", true), num("number", "Set number", 1), num("weight", "Weight"), choice("unit", "Weight unit", "kg", "lb"), num("reps", "Reps"), choice("type", "Set type", "Working", "Warm-up", "Drop set", "Superset", "AMRAP", "Bodyweight", "Assisted"), num("rpe", "RPE"), num("rir", "RIR"), num("rest", "Rest (seconds)"), field("variation", "Grip / variation"), notes] },
  templates: { title: "Template sets", fields: [link("plan", "Workout plan", "plans", true), link("exercise", "Exercise", "exercises", true), num("number", "Set number", 1), num("weight", "Planned weight"), choice("unit", "Weight unit", "kg", "lb"), num("reps", "Planned reps"), choice("type", "Set type", "Working", "Warm-up", "Drop set", "Superset", "AMRAP", "Bodyweight", "Assisted"), num("rest", "Rest (seconds)"), notes] },
  records: { title: "Manual personal records", fields: [link("exercise", "Exercise", "exercises", true), num("weight", "Weight"), choice("unit", "Weight unit", "kg", "lb"), num("reps", "Reps"), notes] },
  foods: { title: "Food database", fields: [field("brand", "Brand"), field("category", "Category"), { ...num("serving", "Base quantity", 0.0001), required: true }, choice("unit", "Unit", "g", "ml", "serving", "item"), choice("state", "State", "Unspecified", "Raw", "Cooked"), choice("favorite", "Favorite", "No", "Yes"), ...fuel, notes] },
  meals: { title: "Meal entries", fields: [link("food", "Food (optional)", "foods"), field("meal", "Meal name"), num("quantity", "Quantity", 0.0001), field("unit", "Unit"), ...fuel, notes] },
  diets: { title: "Diet planning", fields: [choice("type", "Day type", "Any", "Training", "Rest"), field("meal", "Planned meal"), link("food", "Planned food", "foods"), num("quantity", "Planned quantity", 0.0001), ...fuel, notes] },
  recipes: { title: "Recipes", fields: [{ ...num("servings", "Servings", 0.0001), required: true }, field("instructions", "Instructions", "textarea"), notes] },
  ingredients: { title: "Recipe ingredients", fields: [link("recipe", "Recipe", "recipes", true), link("food", "Food", "foods", true), { ...num("quantity", "Quantity in food's base unit", 0.0001), required: true }, notes] },
  measurements: { title: "Body measurements", fields: [num("weight", "Weight"), choice("unit", "Weight unit", "kg", "lb"), choice("measurementUnit", "Circumference unit", "cm", "in"), ...["waist", "chest", "arm", "thigh", "neck", "hip"].map((key) => num(key, key[0].toUpperCase() + key.slice(1))), num("bodyfat", "Body fat (%)"), num("muscle", "Muscle mass (kg)"), num("skeletal", "Skeletal muscle mass (kg)"), num("bmi", "BMI (manual)"), num("bmr", "BMR (manual kcal)"), num("visceral", "Visceral fat reading (manual)"), field("time", "Measurement time", "time"), field("extra", "Additional measurements"), notes] },
  projects: { title: "Projects", fields: [choice("status", "Status", "Planned", "In Progress", "On Hold", "Completed", "Archived"), field("category", "Category"), field("deadline", "Deadline", "date"), num("progress", "Progress (%)"), field("repository", "Repository URL", "url"), field("milestones", "Milestones", "textarea"), notes] },
  milestones: { title: "Project milestones", fields: [link("project", "Project", "projects", true), choice("status", "Status", "Open", "Completed"), notes] },
  work: { title: "Work sessions", fields: [link("project", "Project", "projects"), field("category", "Category"), num("minutes", "Minutes"), num("breaks", "Break minutes"), notes] },
  focus: { title: "Focus sessions", fields: [link("project", "Project", "projects"), num("minutes", "Minutes"), notes] },
  career: { title: "Career applications", fields: [field("company", "Company"), field("role", "Role"), field("status", "Status"), field("interview", "Interview date", "date"), field("followup", "Follow-up", "date"), field("compensation", "Compensation notes"), field("listing", "Listing URL", "url"), notes] },
  habits: { title: "Habits", fields: [choice("frequency", "Frequency", "Daily", "Weekly", "Selected weekdays"), field("weekdays", "Weekdays (Sun, Mon, Tue…)"), num("target", "Target"), field("unit", "Unit"), choice("state", "Status", "Active", "Archived"), notes] },
  habitlogs: { title: "Habit logs", fields: [link("habit", "Habit", "habits", true), num("amount", "Amount"), notes] },
  routines: { title: "Routines", fields: [field("steps", "Steps (one per line)", "textarea", true), notes] },
  routinelogs: { title: "Routine history", fields: [link("routine", "Routine", "routines", true), field("done", "Completed steps", "textarea", true), notes] },
  wellness: { title: "Sleep, hydration and activity", fields: [field("sleep", "Sleep start", "datetime-local"), field("wake", "Wake time", "datetime-local"), choice("quality", "Sleep quality", "Poor", "Fair", "Good", "Excellent"), num("water", "Water (ml)"), num("steps", "Steps"), num("distance", "Distance (km)"), field("activity", "Activity"), num("calories", "Estimated calories burned"), num("heart", "Resting heart rate (bpm)"), num("energy", "Energy"), field("mood", "Mood"), notes] },
  coding: { title: "Coding practice", fields: [field("platform", "Platform"), choice("difficulty", "Difficulty", "Easy", "Medium", "Hard"), choice("solved", "Solved", "Yes", "No"), field("url", "Problem URL", "url"), field("topic", "Topic"), field("language", "Language"), num("minutes", "Minutes"), num("attempts", "Attempts"), notes] },
  learning: { title: "Learning", fields: [choice("type", "Resource type", "Skill", "Course", "Book", "Tutorial", "Certification", "Other"), field("resource", "Resource URL", "url"), link("project", "Related project", "projects"), num("minutes", "Study minutes"), num("lessons", "Completed lessons"), num("total", "Total lessons"), field("revision", "Revision date", "date"), notes] },
  finance: { title: "Finance transactions", fields: [choice("direction", "Kind", "Expense", "Income", "Transfer"), { ...num("amount", "Amount", 0.01), required: true }, field("category", "Category"), field("account", "Account"), field("destination", "Destination account"), field("method", "Payment method"), field("tags", "Tags"), notes] },
  budgets: { title: "Budgets", fields: [field("category", "Category (blank for all)", "text"), { ...num("amount", "Monthly limit", 0.01), required: true }, notes] },
  accounts: { title: "Finance accounts", fields: [choice("type", "Type", "Cash", "Bank", "Credit", "Investments", "Other"), num("opening", "Opening balance", -1e12), notes] },
  subscriptions: { title: "Recurring expenses", fields: [{ ...num("amount", "Amount", 0.01), required: true }, choice("cycle", "Frequency", "Monthly", "Weekly", "Yearly"), field("account", "Account"), field("category", "Category"), notes] },
  events: { title: "Calendar events", fields: [field("time", "Start time (blank for all day)", "time"), field("end", "End time", "time"), num("repeat", "Repeat every N days"), field("until", "Repeat until", "date"), field("category", "Category"), notes] },
  goals: { title: "Goals", fields: [choice("source", "Progress source", "Manual", "Body weight (kg)", "Completed workout logs", "Solved coding entries", "Linked quests completed", "Work hours", "Net cash flow"), num("start", "Starting value", -1e9), num("current", "Manual current value", -1e9), num("target", "Target", -1e9), field("unit", "Unit"), field("deadline", "Target date", "date"), field("milestones", "Milestones", "textarea"), notes] },
  journal: { title: "Journal and notes", fields: [field("tags", "Tags"), choice("favorite", "Favorite", "No", "Yes"), field("text", "Entry", "textarea", true)] },
  settings: { title: "Settings", fields: [field("timezone", "IANA timezone"), field("currency", "ISO currency"), field("github", "GitHub username"), field("leetcode", "LeetCode username"), num("water", "Daily water target (ml)"), num("work", "Weekly work target (minutes)"), num("weight", "Target weight (kg)"), num("focus", "Focus target (minutes)", 1), ...fuel] },
  adjustments: { title: "Manual XP adjustments", fields: [{ ...num("delta", "XP adjustment (positive or negative)", -100000), required: true }, field("notes", "Reason", "textarea", true)] },
  achievements: { title: "Achievement history", fields: [field("code", "Badge code", "text", true)] },
  mealtemplates: { title: "Meal templates", fields: [field("meal", "Meal"), ...fuel] },
};

export const trackerGroups: Record<string, string[]> = {
  fitness: ["workouts", "plans", "exercises", "templates", "sets", "records"],
  nutrition: ["meals", "foods", "mealtemplates", "diets", "recipes", "ingredients", "measurements"],
  work: ["work", "projects", "milestones", "focus", "career"],
  wellness: ["habits", "habitlogs", "routines", "routinelogs", "wellness"],
  coding: ["coding", "learning"],
  personal: ["finance", "accounts", "budgets", "subscriptions", "events", "goals", "journal"],
  settings: ["settings", "adjustments"],
};

trackers.sets.fields.push(choice("status", "Completion", "Completed", "Planned"));
trackers.plans.fields.push(field("rotation", "Rotation from start date (comma-separated labels, Rest on days off)"));
trackers.events.fields.push(field("weekdays", "Repeat on weekdays (Sun, Mon, Tue…)"));
trackers.learning.fields.push(field("learningGoal", "Learning goal"), num("targetMinutes", "Weekly study target (minutes)"));
trackers.settings.fields.push(num("xpPerLevel", "XP per level", 1), choice("gamification", "Show XP and levels", "Yes", "No"));
trackers.settings.fields.push(field("categoryLevels", "Category levels (one Category=XP per line)", "textarea"));
for (const mode of ["training", "rest"]) for (const name of ["calories", "protein", "carbs", "fat"]) {
  trackers.settings.fields.push(num(mode + "_" + name, mode[0].toUpperCase() + mode.slice(1) + " day " + name));
}
trackers.settings.fields.push(num("shortBreak", "Short break (minutes)", 1), num("longBreak", "Long break (minutes)", 1));
trackers.settings.fields.push(field("name", "Display name"), choice("reminders", "Show in-app reminders", "Yes", "No"), field("widgets", "Dashboard card order (comma-separated card labels; blank shows all)"));
trackers.settings.fields.push(field("hiddenModules", "Hide module names (comma-separated)"), choice("reminderHabits", "Habit reminders", "Yes", "No"), choice("reminderDeadlines", "Project and goal deadline reminders", "Yes", "No"), choice("reminderBills", "Recurring expense reminders", "Yes", "No"));
trackers.settings.fields.push(field("briefOrder", "Daily widgets (comma-separated order: training, nutrition, habits, deadlines, progress; omit to hide)"));
trackers.settings.fields.push(...[["workouts", "Workout"], ["focus", "Focus"], ["habitlogs", "Habit log"], ["coding", "Solved coding problem"], ["milestones", "Project milestone"]].map(([kind, label]) => num("reward_" + kind, label + " XP")));
