# Chatra App Refactoring Plan

## Overview
This plan outlines the refactoring required to bring the Chatra mobile app into compliance with the mobile app development rules defined in `.roo/rules/mobile-apps.md`.

## Identified Violations

### 1. Screen Structure Violations
- **[`announcement_screen.dart`](Apps/chatra/lib/announcement_screen.dart:1)**: Not using StatefulWidget pattern, missing AnimatedGradientBg wrapper
- **[`classroom_screen.dart`](Apps/chatra/lib/classroom_screen.dart:1)**: Not using StatefulWidget pattern, missing AnimatedGradientBg wrapper
- **[`leave_management_screen.dart`](Apps/chatra/lib/leave_management_screen.dart:1)**: Not using BLoC pattern, direct API calls instead of state management

### 2. Design System Violations
- **[`AnimatedGradientBg`](Apps/chatra/lib/widgets/animated_gradient_bg.dart:1)**: Not actually animated (no animation controller)
- Some screens not consistently using AnimatedGradientBg wrapper
- **[`PullToRefresh`](Apps/chatra/lib/widgets/common/pull_to_refresh.dart:1)**: Using hardcoded colors (Colors.blue) instead of AppColors

### 3. Component Guidelines Violations
- Inconsistent use of GlassCard across screens
- Some screens missing proper padding/margin standards

### 4. File Organization Issues
- Duplicate [`api_response.dart`](Apps/chatra/lib/services/api_response.dart:1) file (also exists in core/models/)
- [`leave_management_screen.dart`](Apps/chatra/lib/leave_management_screen.dart:1) exceeds 300 lines (604 lines)

### 5. State Management Issues
- [`leave_management_screen.dart`](Apps/chatra/lib/leave_management_screen.dart:1) missing BLoC pattern implementation

### 6. Missing Components
- No leave management BLoC files (state, event, bloc)
- No announcement BLoC files
- No classroom BLoC files

## Refactoring Tasks

### Phase 1: Core Infrastructure Fixes

#### Task 1.1: Fix AnimatedGradientBg
- **File**: [`Apps/chatra/lib/widgets/animated_gradient_bg.dart`](Apps/chatra/lib/widgets/animated_gradient_bg.dart:1)
- **Changes**: Add animation controller to make gradient actually animated
- **Requirements**: Use flutter_animate for smooth transitions (500ms default)

#### Task 1.2: Fix PullToRefresh Colors
- **File**: [`Apps/chatra/lib/widgets/common/pull_to_refresh.dart`](Apps/chatra/lib/widgets/common/pull_to_refresh.dart:1)
- **Changes**: Replace hardcoded Colors.blue with AppColors.accentTeal
- **Requirements**: Use consistent color palette from app_theme.dart

#### Task 1.3: Remove Duplicate api_response.dart
- **File**: [`Apps/chatra/lib/services/api_response.dart`](Apps/chatra/lib/services/api_response.dart:1)
- **Changes**: Remove duplicate file, use core/models/api_response.dart instead
- **Requirements**: Update all imports to use core/models/api_response.dart

### Phase 2: Screen Structure Refactoring

#### Task 2.1: Refactor Announcement Screen
- **File**: [`Apps/chatra/lib/announcement_screen.dart`](Apps/chatra/lib/announcement_screen.dart:1)
- **Changes**:
  - Convert to StatefulWidget
  - Add AnimatedGradientBg wrapper
  - Follow standard screen structure pattern
  - Add proper BLoC integration

#### Task 2.2: Refactor Classroom Screen
- **File**: [`Apps/chatra/lib/classroom_screen.dart`](Apps/chatra/lib/classroom_screen.dart:1)
- **Changes**:
  - Convert to StatefulWidget
  - Add AnimatedGradientBg wrapper
  - Follow standard screen structure pattern
  - Add proper BLoC integration

#### Task 2.3: Refactor Leave Management Screen
- **File**: [`Apps/chatra/lib/leave_management_screen.dart`](Apps/chatra/lib/leave_management_screen.dart:1)
- **Changes**:
  - Split into multiple files (keep under 300 lines)
  - Implement BLoC pattern
  - Add AnimatedGradientBg wrapper
  - Extract widgets to separate files

### Phase 3: BLoC Implementation

#### Task 3.1: Create Leave Management BLoC
- **New Files**:
  - `Apps/chatra/lib/logic/leave/leave_state.dart`
  - `Apps/chatra/lib/logic/leave/leave_event.dart`
  - `Apps/chatra/lib/logic/leave/leave_bloc.dart`
- **Requirements**: Follow BLoC pattern with proper state management

#### Task 3.2: Create Announcement BLoC
- **New Files**:
  - `Apps/chatra/lib/logic/announcement/announcement_state.dart`
  - `Apps/chatra/lib/logic/announcement/announcement_event.dart`
  - `Apps/chatra/lib/logic/announcement/announcement_bloc.dart`
- **Requirements**: Follow BLoC pattern with proper state management

#### Task 3.3: Create Classroom BLoC
- **New Files**:
  - `Apps/chatra/lib/logic/classroom/classroom_state.dart`
  - `Apps/chatra/lib/logic/classroom/classroom_event.dart`
  - `Apps/chatra/lib/logic/classroom/classroom_bloc.dart`
- **Requirements**: Follow BLoC pattern with proper state management

### Phase 4: Widget Extraction

#### Task 4.1: Extract Leave Management Widgets
- **New Files**:
  - `Apps/chatra/lib/widgets/leave/leave_balance_card.dart`
  - `Apps/chatra/lib/widgets/leave/leave_application_form.dart`
  - `Apps/chatra/lib/widgets/leave/leave_history_item.dart`
  - `Apps/chatra/lib/widgets/leave/leave_status_indicator.dart`
- **Requirements**: Keep each widget file under 300 lines

#### Task 4.2: Extract Announcement Widgets
- **New Files**:
  - `Apps/chatra/lib/widgets/announcement/announcement_card.dart`
  - `Apps/chatra/lib/widgets/announcement/announcement_filter.dart`
- **Requirements**: Keep each widget file under 300 lines

#### Task 4.3: Extract Classroom Widgets
- **New Files**:
  - `Apps/chatra/lib/widgets/classroom/classroom_card.dart`
  - `Apps/chatra/lib/widgets/classroom/classroom_list.dart`
- **Requirements**: Keep each widget file under 300 lines

### Phase 5: Consistency Updates

#### Task 5.1: Update All Screens to Use AnimatedGradientBg
- **Files**: All screen files
- **Changes**: Ensure all screens use AnimatedGradientBg wrapper
- **Requirements**: Consistent background across all screens

#### Task 5.2: Update All Cards to Use GlassCard
- **Files**: All widget files
- **Changes**: Ensure all cards use GlassCard with proper padding (16 or 20)
- **Requirements**: Consistent card styling across app

#### Task 5.3: Update All Icons to Use _rounded Suffix
- **Files**: All screen and widget files
- **Changes**: Ensure all Material Icons use _rounded suffix
- **Requirements**: Modern icon style consistency

### Phase 6: Accessibility & Performance

#### Task 6.1: Add Semantic Labels
- **Files**: All interactive elements
- **Changes**: Add semantic labels for screen readers
- **Requirements**: Support accessibility features

#### Task 6.2: Add Loading States
- **Files**: All screens with API calls
- **Changes**: Add skeleton loaders during data fetch
- **Requirements**: Use SkeletonLoader widget

#### Task 6.3: Add Empty States
- **Files**: All list screens
- **Changes**: Add empty state widgets with helpful messages
- **Requirements**: Use EmptyState widget

### Phase 7: Testing & Documentation

#### Task 7.1: Add Unit Tests
- **Files**: All BLoC files
- **Changes**: Add unit tests for business logic
- **Requirements**: Aim for 80%+ coverage

#### Task 7.2: Add Widget Tests
- **Files**: All widget files
- **Changes**: Add widget tests for UI components
- **Requirements**: Test all widget states

#### Task 7.3: Update Documentation
- **Files**: All modified files
- **Changes**: Add doc comments for public APIs
- **Requirements**: Keep comments up-to-date

## File Structure After Refactoring

```
Apps/chatra/lib/
├── screens/
│   ├── home_screen.dart
│   ├── account_screen.dart
│   ├── announcement_screen.dart
│   ├── attendance_calendar_screen.dart
│   ├── bus_tracking_screen.dart
│   ├── classroom_screen.dart
│   ├── fees_screen.dart
│   ├── intro_screen.dart
│   ├── leave_management_screen.dart
│   ├── live_classroom_screen.dart
│   ├── login_screen.dart
│   └── navbar_screen.dart
├── widgets/
│   ├── animated_gradient_bg.dart
│   ├── glass_card.dart
│   ├── account/
│   │   ├── profile_header_widget.dart
│   │   ├── personal_details_widget.dart
│   │   └── settings_widget.dart
│   ├── announcement/
│   │   ├── announcement_card.dart
│   │   └── announcement_filter.dart
│   ├── classroom/
│   │   ├── classroom_card.dart
│   │   └── classroom_list.dart
│   ├── common/
│   │   ├── empty_state.dart
│   │   ├── pull_to_refresh.dart
│   │   └── skeleton_loader.dart
│   ├── home/
│   │   ├── dashboard_stats_widget.dart
│   │   ├── personalized_greeting.dart
│   │   ├── spotlight_search_widget.dart
│   │   └── timetable_widget.dart
│   └── leave/
│       ├── leave_balance_card.dart
│       ├── leave_application_form.dart
│       ├── leave_history_item.dart
│       └── leave_status_indicator.dart
├── logic/
│   ├── academic/
│   ├── announcement/
│   │   ├── announcement_bloc.dart
│   │   ├── announcement_event.dart
│   │   └── announcement_state.dart
│   ├── attendance/
│   ├── auth/
│   ├── classroom/
│   │   ├── classroom_bloc.dart
│   │   ├── classroom_event.dart
│   │   └── classroom_state.dart
│   ├── dashboard/
│   ├── fees/
│   ├── leave/
│   │   ├── leave_bloc.dart
│   │   ├── leave_event.dart
│   │   └── leave_state.dart
│   ├── live/
│   ├── notices/
│   └── transport/
├── services/
│   ├── api_service.dart
│   └── notification_service.dart
├── theme/
│   └── app_theme.dart
├── router/
│   └── app_router.dart
├── core/
│   └── models/
│       └── api_response.dart
└── main.dart
```

## Implementation Order

1. **Phase 1**: Core Infrastructure Fixes (Quick wins)
2. **Phase 2**: Screen Structure Refactoring (Foundation)
3. **Phase 3**: BLoC Implementation (State Management)
4. **Phase 4**: Widget Extraction (Code Organization)
5. **Phase 5**: Consistency Updates (UI/UX)
6. **Phase 6**: Accessibility & Performance (Quality)
7. **Phase 7**: Testing & Documentation (Reliability)

## Success Criteria

- All screens follow the standard StatefulWidget pattern
- All screens use AnimatedGradientBg wrapper
- All BLoC patterns properly implemented
- All widget files under 300 lines
- All cards use GlassCard with consistent styling
- All icons use _rounded suffix
- All interactive elements have semantic labels
- All loading states use SkeletonLoader
- All empty states use EmptyState widget
- Unit test coverage 80%+
- All public APIs have doc comments
