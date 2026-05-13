# Import Template Guide

This guide explains how to use the blank template CSV to import your own financial data into "A Penny For Our Thoughts".

## Getting Started

1. **Download** `blank-template.csv` from this folder
2. **Open** it in Excel, Google Sheets, or any text editor
3. **Fill in** your data following the section guide below
4. **Save** as CSV format
5. **Import** using the "⬆ Import" button in the app header

## Template Sections

### ALLOCATION (Required)
```
allocation: needs,wants,savings
50,30,20
```
Your budget split percentages. Must total 100%.
- **needs**: Fixed expenses (rent, utilities, groceries)
- **wants**: Discretionary spending (dining, entertainment)
- **savings**: Savings target percentage

### INCOME STREAMS (Optional)
```
incomeStreams: id,name,amount,biweekly
[unique-id],Full-Time Salary,2500,false
[unique-id],Freelance Work,600,true
```
- **id**: Any unique identifier (e.g., `inc_1`, `job_primary`)
- **name**: Income source name
- **amount**: Monthly or bi-weekly amount
- **biweekly**: `true` if paid every 2 weeks, `false` if monthly

### EXPENSE CARDS (Optional)
```
expenseCards: cardId,cardLabel,itemId,itemName,itemAmount,itemBiweekly
[card-id],Housing,item_1,Rent,1200,false
[card-id],Housing,item_2,Internet,80,false
[card-id],Transportation,item_3,Car Insurance,120,false
```
- **cardId**: Unique card identifier (repeated for each item on the card)
- **cardLabel**: Category name (e.g., Housing, Transportation)
- **itemId**: Unique item identifier
- **itemName**: Expense item name
- **itemAmount**: Monthly or bi-weekly amount
- **itemBiweekly**: `true` if bi-weekly, `false` if monthly

### CREDIT CARDS (Optional)
```
creditCards: id,name,balance,limit
[unique-id],My Visa,500,2000
[unique-id],My Amex,750,5000
```
- **id**: Unique card identifier
- **name**: Card name (can include last 4 digits)
- **balance**: Current balance owed
- **limit**: Credit limit

### LOANS (Optional)
```
loans: id,name,remaining,original
[unique-id],Car Loan,15000,20000
[unique-id],Student Loans,8500,15000
```
- **id**: Unique loan identifier
- **name**: Loan name
- **remaining**: Amount still owed
- **original**: Original loan amount

### SAVINGS ACCOUNTS (Optional)
```
savingsAccounts: id,name,allocated
[unique-id],Emergency Fund,2000
[unique-id],House Fund,5000
```
- **id**: Unique account identifier
- **name**: Account name
- **allocated**: Amount allocated to this account

### SUBSCRIPTIONS (Optional)
```
subscriptions: id,name,date
[unique-id],Netflix,2026-09-15
[unique-id],Spotify,2026-10-20
```
- **id**: Unique subscription identifier
- **name**: Service name
- **date**: Next renewal date (YYYY-MM-DD format)

### WISHLIST (Optional)
```
wishlist: id,icon,name,url
[unique-id],💻,MacBook Pro,https://www.apple.com/macbook-pro
[unique-id],🎮,PlayStation 5,https://www.playstation.com
```
- **id**: Unique item identifier
- **icon**: Emoji icon for visual appeal
- **name**: Item name
- **url**: Link to the product (optional)

### SAVINGS ACCOUNTS (Optional)
```
savingsAccounts: id,name,balance,defaultAllocated,monthlyAllocations
[unique-id],TFSA,25000,135,"{}"
[unique-id],FHSA,5000,150,"{""2026-06"":200}"
[unique-id],Emergency Fund,10000,200,"{}"
```
- **id**: Unique account identifier
- **name**: Account name (e.g., TFSA, RRSP, Emergency Fund)
- **balance**: Current balance in account (e.g., `25000` for $25,000)
- **defaultAllocated**: Default monthly allocation from savings budget (e.g., `135` for $135/month)
- **monthlyAllocations**: JSON object with monthly overrides (e.g., `{"2026-06":200}` to allocate $200 in June 2026 instead of default)

### SAVINGS GOALS (Optional)
```
goals: id,accountId,targetAmount,targetDate
[unique-id],[account-id],50000,2027-12-31
[unique-id],[account-id],10000,2026-08-31
```
- **id**: Unique goal identifier
- **accountId**: ID of the savings account this goal is for (must match a savings account id)
- **targetAmount**: Target amount in dollars (e.g., `50000` for $50,000)
- **targetDate**: Target date in YYYY-MM format (e.g., `2027-12` for December 2027)

## Tips

- **IDs**: Use simple unique identifiers like `id_1`, `id_2`, or descriptive names
- **Complex Fields**: For `items` and complex JSON structures, see `sample-data.csv` for examples
- **Empty Sections**: Leave a section blank if you don't have data for it yet (just headers)
- **Dates**: Use `YYYY-MM-DD` format (e.g., `2026-05-15`)
- **Numbers**: Use plain numbers without currency symbols (e.g., `2500` not `$2,500`)

## Example Usage

Start simple:
1. Fill in just **Allocation** and **Income Streams**
2. Add **Credit Cards** and **Loans** (these are static)
3. Gradually add other sections as needed

You can always import again later to update your data.

## Troubleshooting

- **Import fails?** Check that all commas in the CSV are properly formatted
- **Numbers not importing?** Remove currency symbols and commas from numbers
- **JSON errors?** For complex fields like `items`, copy from the sample-data.csv
- **Dates not working?** Use `YYYY-MM-DD` format exactly

---

**Need help?** See `sample-data.csv` for a fully populated example of the CSV format.
