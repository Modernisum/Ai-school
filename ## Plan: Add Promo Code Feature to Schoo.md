## Plan: Add Promo Code Feature to School Profile (SuperAdmin)

Add a feature to the SuperAdmin frontend so that, on the school profile page (e.g., http://localhost:3001/schools/651023), admins can apply a promo code to a school. This will involve UI changes to add a promo code input section, API integration to validate and apply the promo code, and updating the UI to reflect the new credit if the promo code is valid.

**Steps**
1. **Frontend UI Update**
   - Locate the school profile page component (likely in SuperAdmin/src/pages or a similar directory).
   - Add a new section or card for "Apply Promo Code" with an input field and submit button.
   - Display feedback (success/error) and updated credit details after applying a promo code.

2. **API Integration**
   - Identify or create an API endpoint to validate and apply a promo code for a school (likely in Backend).
   - Integrate this API in the frontend using the existing API utility (see SuperAdmin/src/api.js).
   - On submit, call the API with the school ID and entered promo code.

3. **Backend Logic (if needed)**
   - Ensure there is an endpoint to handle promo code application (e.g., POST /api/admin/schools/:schoolId/apply-promo).
   - The endpoint should:
     - Validate the promo code.
     - Apply the promo code to the school if valid.
     - Update the school's credit.
     - Return the updated credit and status.

4. **Frontend State Update**
   - On successful promo code application, update the UI to show the new credit.
   - Handle and display error messages if the promo code is invalid or already used.

5. **Testing**
   - Manually test the feature by navigating to a school profile, applying valid/invalid promo codes, and verifying credit updates.
   - (Optional) Add automated tests for the new UI and API logic.

**Verification**
- Navigate to http://localhost:3001/schools/{schoolId}, apply a promo code, and confirm the credit updates as expected.
- Check for error handling with invalid or already-used promo codes.
- Confirm API calls and responses in browser dev tools.

**Decisions**
- Promo code application is handled via a new or existing API endpoint.
- UI feedback is immediate and user-friendly.