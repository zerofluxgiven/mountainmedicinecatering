# Manual Testing Checklist

## 🚀 Pre-Launch Checklist

**Date:** ___________  
**Tester:** ___________  
**Version:** ___________  
**Environment:** [ ] Development [ ] Staging [ ] Production

### 1. Environment Setup
- [ ] `.env` file exists with valid Firebase credentials
- [ ] `npm install` completed without errors
- [ ] `npm start` runs without console errors
- [ ] App loads at http://localhost:3000

### 2. Authentication Flow

#### Login
- [ ] Login page displays correctly
- [ ] Email validation works (invalid email shows error)
- [ ] Password field masks input
- [ ] "Sign In" button disabled while loading
- [ ] Successful login redirects to dashboard
- [ ] Failed login shows error message
- [ ] Error message is user-friendly

#### Session Management
- [ ] Refresh page maintains logged-in state
- [ ] Logout button works
- [ ] Logout redirects to login page
- [ ] Cannot access protected routes when logged out

### 3. Layout & Navigation

#### Desktop (1024px+)
- [ ] Sidebar visible by default
- [ ] Sidebar toggle button works
- [ ] All navigation links work
- [ ] Active page is highlighted
- [ ] Purple theme colors display correctly

#### Tablet (768px)
- [ ] Layout adjusts appropriately
- [ ] Navigation remains usable
- [ ] Content is readable

#### Mobile (375px)
- [ ] Sidebar collapses appropriately
- [ ] Mobile menu works
- [ ] All content is accessible
- [ ] No horizontal scrolling

### 4. Event Management

#### Event Selector
- [ ] Dropdown shows all events
- [ ] Can select an event
- [ ] Selected event persists across pages
- [ ] Event context updates UI appropriately

#### No Event Selected
- [ ] Warning message displays
- [ ] Appropriate features are disabled

### 5. Dashboard

#### Statistics
- [ ] Event count displays correctly
- [ ] Recipe count displays correctly
- [ ] Menu count displays correctly
- [ ] Guest count shows for selected event

#### Quick Actions (when event selected)
- [ ] All buttons are visible
- [ ] Buttons have hover states
- [ ] Icons display correctly

#### Upcoming Events
- [ ] Events sorted by date
- [ ] Countdown shows correct days
- [ ] Event cards display all info
- [ ] Empty state shows when no events

### 6. Data Loading

#### Real-time Updates
- [ ] Open app in two tabs
- [ ] Changes in one tab appear in other
- [ ] No duplicate data displayed
- [ ] Loading states show appropriately

#### Error States
- [ ] Network disconnect shows error
- [ ] Can retry failed operations
- [ ] Error messages are helpful

### 7. Performance

#### Page Load
- [ ] Initial load < 3 seconds
- [ ] Subsequent navigation < 1 second
- [ ] No visible layout shifts
- [ ] Images load efficiently

#### Memory
- [ ] Check Chrome DevTools Memory tab
- [ ] No memory leaks after navigation
- [ ] Memory usage reasonable

### 8. Accessibility

#### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Can navigate without mouse

#### Screen Reader (optional)
- [ ] Major landmarks announced
- [ ] Form labels read correctly
- [ ] Error messages announced

### 9. Cross-Browser Testing

#### Chrome
- [ ] All features work
- [ ] Console has no errors

#### Firefox
- [ ] All features work
- [ ] Console has no errors

#### Safari
- [ ] All features work
- [ ] Console has no errors

#### Edge
- [ ] All features work
- [ ] Console has no errors

### 10. Console & Network

#### Console
- [ ] No errors in console
- [ ] No warnings (except React strict mode)
- [ ] No failed resource loads

#### Network
- [ ] API calls succeed
- [ ] No 404 errors
- [ ] Reasonable payload sizes
- [ ] Appropriate caching headers

## 🐛 Issues Found

### Issue #1
**Description:**  
**Steps to Reproduce:**  
**Expected:**  
**Actual:**  
**Severity:** [ ] Critical [ ] Major [ ] Minor  

### Issue #2
**Description:**  
**Steps to Reproduce:**  
**Expected:**  
**Actual:**  
**Severity:** [ ] Critical [ ] Major [ ] Minor  

## 📝 Notes

_Any additional observations or recommendations:_

---

**Testing Complete:** [ ] Yes [ ] No  
**Ready for Deployment:** [ ] Yes [ ] No  

**Sign-off:** _______________________ **Date:** _______________________