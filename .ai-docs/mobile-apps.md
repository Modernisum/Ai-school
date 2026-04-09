# Mobile Apps Development Rules

## Overview
This document contains UI/UX guidelines and development rules for Chatra (student) and Employee mobile apps.

## UI/UX Principles

### 1. Design System
- **Color Palette**: Use consistent colors defined in [`app_theme.dart`](Apps/chatra/lib/theme/app_theme.dart)
- **Typography**: Use Google Fonts (Poppins) consistently across all screens
- **Icons**: Use Material Icons with `_rounded` suffix for modern look
- **Glass Morphism**: Use [`GlassCard`](Apps/chatra/lib/widgets/glass_card.dart) for card components
- **Animations**: Use flutter_animate for smooth transitions (500ms default duration)

### 2. Screen Structure
Every screen should follow this pattern:
```dart
class ScreenName extends StatefulWidget {
  const ScreenName({super.key});
  
  @override
  State<ScreenName> createState() => _ScreenNameState();
}

class _ScreenNameState extends State<ScreenName> {
  // State variables
  // Controllers
  // Services
  
  @override
  void initState() {
    super.initState();
    // Initialize data
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(...),
      body: AnimatedGradientBg(
        child: BlocProvider/Consumer(...)
      ),
    );
  }
}
```

### 3. Navigation
- Use GoRouter for navigation
- Routes defined in [`app_router.dart`](Apps/chatra/lib/router/app_router.dart)
- Use deferred loading for heavy screens
- Bottom navigation via [`navbar_screen.dart`](Apps/chatra/lib/navbar_screen.dart)

### 4. State Management
- Use BLoC pattern for complex state
- Bloc files in `logic/` directory
- State, Event, and Bloc files for each feature
- Use BlocProvider for dependency injection

### 5. API Integration
- All API calls through [`ApiService`](Apps/chatra/lib/api_service.dart)
- Use FlutterSecureStorage for sensitive data
- Handle errors gracefully with user-friendly messages
- Show loading states during API calls

### 6. Responsive Design
- Use MediaQuery for screen dimensions
- Support both portrait and landscape orientations
- Test on different screen sizes (small, medium, large)
- Use flexible layouts (Column, Row, Expanded, Flexible)

### 7. Accessibility
- Use semantic labels for all interactive elements
- Support screen readers
- Minimum touch target size: 48x48 pixels
- High contrast ratios for text

## Component Guidelines

### 1. Cards
- Use [`GlassCard`](Apps/chatra/lib/widgets/glass_card.dart) for consistent styling
- Add padding: EdgeInsets.all(16) or EdgeInsets.all(20)
- Add margin: EdgeInsets.symmetric(vertical: 8)
- Rounded corners: BorderRadius.circular(16)

### 2. Forms
- Use Form with GlobalKey for validation
- Clear error messages
- Auto-focus first field
- Show validation on submit, not on every keystroke
- Use appropriate keyboard types

### 3. Lists
- Use ListView.builder for long lists
- Add separators between items
- Implement pull-to-refresh
- Show empty states with helpful messages
- Add loading skeletons during data fetch

### 4. Buttons
- Primary: ElevatedButton with brand color
- Secondary: TextButton or OutlinedButton
- Icon buttons: IconButton with appropriate size
- Loading state: Show CircularProgressIndicator
- Disable during async operations

### 5. Dialogs
- Use AlertDialog for confirmations
- Use showDialog for custom dialogs
- Add Cancel and Confirm actions
- Close on outside tap (optional)

## Screen-Specific Guidelines

### Home Screen
- Spotlight search for quick navigation
- Dashboard stats widget
- Timetable widget
- Quick action cards

### Account Screen
- Profile header with image upload
- Personal details form
- Settings options
- Logout button

### Fees Screen
- Fee summary card
- Payment history
- Razorpay integration
- Receipt download

### Attendance Screen
- Calendar view
- Attendance statistics
- Radar chart for attendance percentage
- Month navigation

### Leave Management Screen
- Leave application form
- Leave history list
- Leave balance card
- Status indicators (pending/approved/rejected)

## Performance Guidelines

### 1. Code Organization
- Separate widgets into reusable components
- Keep widget files under 300 lines
- Use const constructors where possible
- Extract complex logic into separate files

### 2. Asset Management
- Use compressed images
- Lazy load images
- Cache network images
- Use appropriate image formats (WebP preferred)

### 3. Memory Management
- Dispose controllers and focus nodes
- Cancel ongoing operations on dispose
- Use const widgets where possible
- Avoid unnecessary rebuilds

## Testing Guidelines

### 1. Unit Tests
- Test all business logic
- Mock API services
- Test edge cases
- Aim for 80%+ coverage

### 2. Widget Tests
- Test all widget states
- Test user interactions
- Test accessibility
- Test responsive layouts

### 3. Integration Tests
- Test API integration
- Test navigation flows
- Test state management
- Test error handling

## Security Guidelines

### 1. Data Storage
- Use FlutterSecureStorage for sensitive data
- Never store passwords in plain text
- Clear sensitive data on logout
- Use secure HTTP (HTTPS)

### 2. API Security
- Validate all inputs
- Sanitize user data
- Use JWT tokens for authentication
- Implement rate limiting

### 3. User Privacy
- Request permissions only when needed
- Explain why permissions are needed
- Allow users to revoke permissions
- Follow platform-specific guidelines

## Code Style Guidelines

### 1. Naming Conventions
- Classes: PascalCase (e.g., `HomeScreen`)
- Variables: camelCase (e.g., `studentId`)
- Constants: lowerCamelCase (e.g., `apiBase`)
- Files: snake_case (e.g., `home_screen.dart`)

### 2. File Organization
```
lib/
├── screens/           # Main screen files
├── widgets/           # Reusable widgets
│   ├── home/         # Home-specific widgets
│   ├── account/       # Account-specific widgets
│   └── common/        # Common widgets
├── logic/             # BLoC and business logic
│   ├── auth/
│   ├── dashboard/
│   └── ...
├── services/           # API and external services
├── theme/             # App theme and styling
├── router/            # Navigation configuration
└── main.dart          # App entry point
```

### 3. Comments and Documentation
- Add doc comments for public APIs
- Explain complex logic
- Keep comments up-to-date
- Use TODO for future improvements

## Platform-Specific Guidelines

### Android
- Follow Material Design 3 guidelines
- Use appropriate back button behavior
- Handle lifecycle events properly
- Request permissions at runtime

### iOS
- Follow Human Interface Guidelines
- Use iOS-style navigation
- Handle safe areas properly
- Use iOS-specific widgets when appropriate

## Deployment Guidelines

### 1. Build Configuration
- Use different configs for dev/staging/prod
- Set appropriate API URLs
- Enable/disable debug features
- Configure app signing

### 2. Version Management
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update version in pubspec.yaml
- Maintain changelog
- Test thoroughly before release

### 3. Store Submission
- Prepare app store assets
- Write compelling descriptions
- Include screenshots and videos
- Follow review guidelines

## Common Issues and Solutions

### Issue: App crashes on API error
**Solution**: Wrap API calls in try-catch and show user-friendly error messages

### Issue: State not updating
**Solution**: Use setState() or Bloc events properly, check mounted before setState

### Issue: Memory leaks
**Solution**: Dispose controllers, cancel streams, close connections in dispose()

### Issue: Slow performance
**Solution**: Use const widgets, avoid unnecessary rebuilds, implement lazy loading

### Issue: Navigation not working
**Solution**: Check route configuration, use GoRouter properly, pass required parameters

## Best Practices Summary

1. **User First**: Always prioritize user experience
2. **Consistency**: Maintain consistent design across screens
3. **Performance**: Optimize for smooth 60fps animations
4. **Accessibility**: Make app usable for everyone
5. **Security**: Protect user data and privacy
6. **Testing**: Test thoroughly before release
7. **Documentation**: Keep code well-documented
8. **Code Quality**: Follow clean code principles
9. **Feedback**: Listen to user feedback
10. **Iteration**: Continuously improve based on data
