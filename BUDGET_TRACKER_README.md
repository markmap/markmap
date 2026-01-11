# Biweekly Budget & Bill Tracker

A comprehensive, self-contained web application for tracking your biweekly budget, expenses, and bills. No server or installation required - just open the HTML file in your browser!

## Features

### 💵 Income Tracking
- Add multiple income sources
- Track income by date
- View total income for the period

### 💳 Expense Management
- Categorize expenses (Housing, Utilities, Food, Transportation, Healthcare, Entertainment, Shopping, Other)
- Add detailed expense descriptions
- Track spending by category and date

### 📅 Bill Tracking
- Add bills with due dates
- Mark bills as paid/unpaid
- Visual status indicators:
  - **Paid** (green): Bill has been paid
  - **Upcoming** (yellow): Due within 7 days
  - **Unpaid** (red): Overdue bills
- Organize bills by category

### 📊 Financial Summary
- Real-time calculations of:
  - Total income
  - Total expenses (including unpaid bills)
  - Remaining budget
- Visual progress bars for quick insights
- Color-coded amounts (green for income, red for expenses, blue for remaining)

### 📅 Biweekly Period Management
- Automatic current biweekly period detection
- Custom period selection with date picker
- Periods automatically split at the 1st-15th and 16th-end of month

### 💾 Data Persistence
- Automatic saving to browser local storage
- Data persists between sessions
- No login or account required

### 📥 Import/Export
- Export data as JSON file for backup
- Import previously exported data
- Share data between devices

### 🖨️ Print Support
- Print-friendly layout
- Generate PDF reports through browser print function

## How to Use

### Getting Started

1. **Open the File**
   - Simply open `budget-tracker.html` in any modern web browser
   - No installation or setup required!

2. **Set Your Period**
   - Click "Current Biweekly" to automatically set the current biweekly period
   - Or manually select dates using the date pickers

### Adding Income

1. Enter the income source (e.g., "Salary", "Freelance Work")
2. Enter the amount
3. Click "Add Income"

### Adding Expenses

1. Select a category from the dropdown
2. Enter a description (e.g., "Groceries", "Gas")
3. Enter the amount
4. Click "Add Expense"

### Adding Bills

1. Enter the bill name (e.g., "Electric Bill", "Internet")
2. Enter the amount
3. Select the due date
4. Choose a category
5. Click "Add Bill"

### Managing Bills

- Check the "Paid" checkbox when you pay a bill
- Bills automatically show status based on due date:
  - **Upcoming**: Due within 7 days
  - **Unpaid**: Overdue
  - **Paid**: Marked as paid

### Deleting Items

- Click the "Delete" button next to any income, expense, or bill to remove it
- Deletions are permanent (unless you have an exported backup)

### Data Management

**Export Data:**
- Click "📥 Export Data" to download a JSON backup file
- Save this file to backup your data or transfer to another device

**Import Data:**
- Click "📤 Import Data" to restore from a backup file
- Select the JSON file you previously exported

**Clear All:**
- Click "🗑️ Clear All" to remove all data
- You'll be asked to confirm before deletion

**Print:**
- Click "🖨️ Print" to generate a printable report
- Use your browser's print dialog to save as PDF

## Browser Compatibility

Works with all modern browsers:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## Technical Details

### Storage
- Uses browser LocalStorage for data persistence
- Data is stored locally on your device
- No data is sent to any server
- Maximum storage: ~5-10MB (plenty for budget tracking)

### Privacy
- 100% private and offline
- No tracking or analytics
- No account required
- No data collection

### Data Format

The exported JSON file contains:
```json
{
  "period": {
    "start": "2026-01-01",
    "end": "2026-01-15"
  },
  "income": [...],
  "expenses": [...],
  "bills": [...]
}
```

## Tips for Best Use

1. **Regular Updates**: Update your tracker daily or weekly for best results

2. **Biweekly Periods**: The app is designed for biweekly budgeting, but you can set any date range

3. **Categories**: Use consistent categories to better track spending patterns

4. **Bills**: Add all recurring bills at the start of each period

5. **Backups**: Export your data regularly, especially before clearing or resetting

6. **Multiple Devices**: Export from one device and import to another to sync data

## Troubleshooting

**Data not saving?**
- Ensure your browser allows LocalStorage
- Check that you're not in private/incognito mode
- Try a different browser

**Can't see my data?**
- Make sure you're opening the same file in the same browser
- Check if you accidentally cleared your browser data
- Try importing a backup if you have one

**Visual issues?**
- Make sure JavaScript is enabled
- Try refreshing the page
- Clear browser cache if needed

## Future Enhancements (Ideas)

- Category spending charts
- Monthly spending trends
- Recurring bill templates
- Budget goals and alerts
- Multiple currency support
- Dark mode theme

## License

This budget tracker is provided as-is for personal use. Feel free to modify and share!

---

**Created:** January 2026
**Version:** 1.0
**File:** budget-tracker.html
